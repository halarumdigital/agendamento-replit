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
    // Skip subscription check for admin routes
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth') || req.path.startsWith('/api/public-settings')) {
      return next();
    }

    // Get company from session
    const companyId = req.session.companyId;
    if (!companyId) {
      return next(); // Let other middleware handle authentication
    }

    // Get company subscription info
    const [companyResult] = await db.execute(sql`
      SELECT stripe_customer_id, stripe_subscription_id, status, plan_id
      FROM companies 
      WHERE id = ${companyId}
    `);

    if (!companyResult.length) {
      return res.status(401).json({ 
        message: "Empresa não encontrada",
        blocked: true 
      });
    }

    const company = (companyResult as any)[0];

    // If no Stripe subscription, allow access (free trial or manual management)
    if (!company.stripe_subscription_id) {
      return next();
    }

    // Check subscription status with Stripe
    try {
      const subscription = await stripeService.getSubscription(company.stripe_subscription_id);
      
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      const hasValidPayment = subscription.latest_invoice?.payment_intent?.status === 'succeeded' || 
                             subscription.status === 'trialing';

      if (!isActive || !hasValidPayment) {
        // Update company status in database
        await db.execute(sql`
          UPDATE companies 
          SET status = 'suspended'
          WHERE id = ${companyId}
        `);

        return res.status(402).json({
          message: "Acesso Bloqueado, entre em contato com o suporte",
          blocked: true,
          reason: "payment_failed",
          subscriptionStatus: subscription.status,
          paymentStatus: subscription.latest_invoice?.payment_intent?.status
        });
      }

      // Ensure company status is active if payment is good
      if (company.status === 'suspended') {
        await db.execute(sql`
          UPDATE companies 
          SET status = 'active'
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
    const [companyResult] = await db.execute(sql`
      SELECT stripe_customer_id, stripe_subscription_id, status
      FROM companies 
      WHERE id = ${companyId}
    `);

    if (!companyResult.length) {
      return { isActive: false, message: "Empresa não encontrada" };
    }

    const company = (companyResult as any)[0];

    // If no Stripe subscription, consider active (free trial or manual management)
    if (!company.stripe_subscription_id) {
      return { isActive: true, message: "Sem assinatura Stripe configurada" };
    }

    const subscription = await stripeService.getSubscription(company.stripe_subscription_id);
    
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const hasValidPayment = subscription.latest_invoice?.payment_intent?.status === 'succeeded' || 
                           subscription.status === 'trialing';

    return {
      isActive: isActive && hasValidPayment,
      message: isActive && hasValidPayment ? "Assinatura ativa" : "Pagamento pendente ou falhou",
      subscriptionStatus: subscription.status,
      paymentStatus: subscription.latest_invoice?.payment_intent?.status
    };
  } catch (error) {
    console.error('Erro ao verificar status da assinatura:', error);
    return { isActive: true, message: "Erro ao verificar - acesso liberado temporariamente" };
  }
}