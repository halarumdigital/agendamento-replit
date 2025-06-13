import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export class StripeService {
  async createCustomer(data: {
    email: string;
    name: string;
    phone?: string;
    metadata?: Record<string, string>;
  }) {
    console.log('🔄 Criando cliente no Stripe:', data.name);
    
    const customer = await stripe.customers.create({
      email: data.email,
      name: data.name,
      phone: data.phone,
      metadata: data.metadata || {},
    });

    console.log('✅ Cliente criado no Stripe:', customer.id);
    return customer;
  }

  async createSubscription(data: {
    customerId: string;
    priceId: string;
    trialPeriodDays?: number;
    paymentMethodId?: string;
    metadata?: Record<string, string>;
  }) {
    console.log('🔄 Criando assinatura no Stripe para cliente:', data.customerId);

    const subscriptionData: Stripe.SubscriptionCreateParams = {
      customer: data.customerId,
      items: [{ price: data.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: data.metadata || {},
    };

    if (data.trialPeriodDays && data.trialPeriodDays > 0) {
      subscriptionData.trial_period_days = data.trialPeriodDays;
    }

    if (data.paymentMethodId) {
      subscriptionData.default_payment_method = data.paymentMethodId;
    }

    const subscription = await stripe.subscriptions.create(subscriptionData);

    console.log('✅ Assinatura criada no Stripe:', subscription.id);
    return subscription;
  }

  async createPaymentIntent(data: {
    amount: number;
    currency?: string;
    customerId?: string;
    metadata?: Record<string, string>;
  }) {
    console.log('🔄 Criando PaymentIntent no Stripe:', data.amount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: data.currency || 'brl',
      customer: data.customerId,
      metadata: data.metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ PaymentIntent criado no Stripe:', paymentIntent.id);
    return paymentIntent;
  }

  async getSubscription(subscriptionId: string) {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async cancelSubscription(subscriptionId: string) {
    console.log('🔄 Cancelando assinatura no Stripe:', subscriptionId);
    
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    
    console.log('✅ Assinatura cancelada no Stripe:', subscriptionId);
    return subscription;
  }

  async updateSubscription(subscriptionId: string, data: {
    priceId?: string;
    metadata?: Record<string, string>;
  }) {
    console.log('🔄 Atualizando assinatura no Stripe:', subscriptionId);

    const updateData: Stripe.SubscriptionUpdateParams = {
      metadata: data.metadata,
    };

    if (data.priceId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      updateData.items = [{
        id: subscription.items.data[0].id,
        price: data.priceId,
      }];
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, updateData);
    
    console.log('✅ Assinatura atualizada no Stripe:', subscriptionId);
    return subscription;
  }

  async createPrice(data: {
    productId: string;
    unitAmount: number;
    currency?: string;
    recurring?: {
      interval: 'month' | 'year';
      intervalCount?: number;
    };
  }) {
    console.log('🔄 Criando preço no Stripe para produto:', data.productId);

    const priceData: Stripe.PriceCreateParams = {
      product: data.productId,
      unit_amount: Math.round(data.unitAmount * 100),
      currency: data.currency || 'brl',
    };

    if (data.recurring) {
      priceData.recurring = {
        interval: data.recurring.interval,
        interval_count: data.recurring.intervalCount || 1,
      };
    }

    const price = await stripe.prices.create(priceData);
    
    console.log('✅ Preço criado no Stripe:', price.id);
    return price;
  }

  async createProduct(data: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
  }) {
    console.log('🔄 Criando produto no Stripe:', data.name);

    const product = await stripe.products.create({
      name: data.name,
      description: data.description,
      metadata: data.metadata || {},
    });

    console.log('✅ Produto criado no Stripe:', product.id);
    return product;
  }

  async retrieveSubscription(subscriptionId: string, expand?: string[]) {
    console.log('🔄 Buscando assinatura no Stripe:', subscriptionId);
    
    const params: Stripe.SubscriptionRetrieveParams = {};
    if (expand) {
      params.expand = expand;
    }
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, params);
    return subscription;
  }

  async updateSubscriptionCancellation(subscriptionId: string, cancelAtPeriodEnd: boolean) {
    console.log('🔄 Atualizando cancelamento da assinatura:', subscriptionId);
    
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd
    });
    
    console.log('✅ Cancelamento da assinatura atualizado:', subscriptionId);
    return subscription;
  }

  async handleWebhook(rawBody: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET must be set');
    }

    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      return event;
    } catch (error) {
      console.error('❌ Erro ao verificar webhook do Stripe:', error);
      throw error;
    }
  }

  // Expor a instância do Stripe para operações diretas quando necessário
  get stripe() {
    return stripe;
  }
}

export const stripeService = new StripeService();