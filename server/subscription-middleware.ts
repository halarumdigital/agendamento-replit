import { RequestHandler } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { stripeService } from "./services/stripe";

export interface SubscriptionStatus {
  isActive: boolean;
  message?: string;
  subscriptionStatus?: string;
  paymentStatus?: string;
}

export const checkSubscriptionStatus: RequestHandler = async (req: any, res, next) => {
  try {
    // Skip subscription check for admin routes and public endpoints
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth') || req.path.startsWith('/api/public-settings') || req.path === '/api/plans') {
      return next();
    }

    // Get company from session
    const companyId = req.session.companyId;
    if (!companyId) {
      return next(); // Let other middleware handle authentication
    }

    // Get company subscription info
    const result = await db.execute(sql`
      SELECT stripe_customer_id, stripe_subscription_id, is_active as status, plan_id
      FROM companies 
      WHERE id = ${companyId}
    `);

    const companies = Array.isArray(result[0]) ? result[0] : result as any[];

    if (!companies || companies.length === 0) {
      return res.status(401).json({ 
        message: "Empresa não encontrada",
        blocked: true 
      });
    }

    const company = companies[0];

    // Check if company is marked as inactive in database first
    if (company.status === 0) {
      return res.status(402).json({
        message: "Acesso Bloqueado - Assinatura Suspensa",
        blocked: true,
        reason: "company_inactive"
      });
    }

    // If no Stripe subscription, allow access (free trial or manual management)
    if (!company.stripe_subscription_id) {
      return next();
    }

    // Check subscription status with Stripe
    try {
      const subscription = await stripeService.retrieveSubscription(company.stripe_subscription_id, ['latest_invoice.payment_intent']);
      
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      let hasValidPayment = subscription.status === 'trialing';
      
      if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
        const paymentIntent = subscription.latest_invoice.payment_intent;
        if (paymentIntent && typeof paymentIntent === 'object') {
          hasValidPayment = paymentIntent.status === 'succeeded' || subscription.status === 'trialing';
        }
      }

      if (!isActive || !hasValidPayment) {
        // Update company status in database
        await db.execute(sql`
          UPDATE companies 
          SET is_active = 0, plan_status = 'suspended'
          WHERE id = ${companyId}
        `);

        return res.status(402).json({
          message: "Acesso Bloqueado, entre em contato com o suporte",
          blocked: true,
          reason: "payment_failed",
          subscriptionStatus: subscription.status,
          paymentStatus: subscription.latest_invoice && typeof subscription.latest_invoice === 'object' && 
                        subscription.latest_invoice.payment_intent && typeof subscription.latest_invoice.payment_intent === 'object' ? 
                        subscription.latest_invoice.payment_intent.status : 'unknown'
        });
      }

      // Ensure company status is active if payment is good
      if (company.status === 0) {
        await db.execute(sql`
          UPDATE companies 
          SET is_active = 1, plan_status = 'active'
          WHERE id = ${companyId}
        `);
      }

      next();
    } catch (stripeError) {
      console.error('Erro ao verificar assinatura no Stripe:', stripeError);
      // If Stripe is down, allow access but log the error
      next();
    }

  } catch (error) {
    console.error('Erro no middleware de assinatura:', error);
    next();
  }
};

export async function getCompanySubscriptionStatus(companyId: number): Promise<SubscriptionStatus> {
  try {
    const result = await db.execute(sql`
      SELECT stripe_customer_id, stripe_subscription_id, is_active as status
      FROM companies 
      WHERE id = ${companyId}
    `);

    const companies = Array.isArray(result[0]) ? result[0] : result as any[];
    
    if (!companies || companies.length === 0) {
      return { isActive: false, message: "Empresa não encontrada" };
    }

    const company = companies[0];

    // If no Stripe subscription, consider active (free trial or manual management)
    if (!company.stripe_subscription_id) {
      return { isActive: true, message: "Sem assinatura Stripe configurada" };
    }

    try {
      const subscription = await stripeService.retrieveSubscription(company.stripe_subscription_id, ['latest_invoice.payment_intent']);
      
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      let hasValidPayment = subscription.status === 'trialing';
      
      if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
        const paymentIntent = subscription.latest_invoice.payment_intent;
        if (paymentIntent && typeof paymentIntent === 'object') {
          hasValidPayment = paymentIntent.status === 'succeeded' || subscription.status === 'trialing';
        }
      }

      return {
        isActive: isActive && hasValidPayment,
        message: isActive && hasValidPayment ? "Assinatura ativa" : "Pagamento pendente ou falhou",
        subscriptionStatus: subscription.status,
        paymentStatus: subscription.latest_invoice && typeof subscription.latest_invoice === 'object' && 
                      subscription.latest_invoice.payment_intent && typeof subscription.latest_invoice.payment_intent === 'object' ? 
                      subscription.latest_invoice.payment_intent.status : 'unknown'
      };
    } catch (stripeError) {
      console.error('Erro ao buscar dados do Stripe:', stripeError);
      return { isActive: true, message: "Erro ao verificar Stripe - acesso liberado temporariamente" };
    }
  } catch (error) {
    console.error('Erro ao verificar status da assinatura:', error);
    return { isActive: true, message: "Erro ao verificar - acesso liberado temporariamente" };
  }
}