import React, { useState } from 'react';
import {
  Grid,
  Column,
  Button,
  Tag,
  Modal,
  Tile,
  InlineNotification,
} from '@carbon/react';
import {
  Checkmark,
  Close,
  Money,
  Purchase,
  Receipt,
  Download,
  Star,
} from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/pages/account/Plan.module.scss';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  priceAnnual: string;
  description: string;
  popular?: boolean;
  current?: boolean;
  features: PlanFeature[];
}

const Plan: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'Free',
      priceAnnual: 'Free',
      description: 'Perfect for individuals getting started with mining reports',
      current: true, // Demo: current plan
      features: [
        { name: 'Up to 3 mining sites', included: true },
        { name: 'Basic report templates', included: true },
        { name: '5 reports per month', included: true },
        { name: 'Email support', included: true },
        { name: 'Single user', included: true },
        { name: 'Advanced analytics', included: false },
        { name: 'Custom templates', included: false },
        { name: 'Priority support', included: false },
        { name: 'API access', included: false },
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$29/month',
      priceAnnual: '$299/year',
      description: 'Best for growing teams and multiple projects',
      popular: true,
      features: [
        { name: 'Unlimited mining sites', included: true },
        { name: 'All report templates', included: true },
        { name: 'Unlimited reports', included: true },
        { name: 'Priority email support', included: true },
        { name: 'Up to 10 users', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Custom templates', included: true },
        { name: 'Real-time collaboration', included: true },
        { name: 'API access', included: false },
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$99/month',
      priceAnnual: '$999/year',
      description: 'For large organizations with advanced needs',
      features: [
        { name: 'Unlimited everything', included: true },
        { name: 'All report templates', included: true },
        { name: 'Unlimited reports', included: true },
        { name: '24/7 phone & email support', included: true },
        { name: 'Unlimited users', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Custom templates', included: true },
        { name: 'Real-time collaboration', included: true },
        { name: 'Full API access', included: true },
      ],
    },
  ];

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = () => {
    // Demo: This would normally integrate with a payment provider
    console.log('Upgrading to plan:', selectedPlan?.name);
    setIsUpgradeModalOpen(false);
    setSelectedPlan(null);
  };

  const currentPlan = plans.find(plan => plan.current);
  const savingsPercentage = Math.round(((299 * 12 - 299) / (299 * 12)) * 100); // Demo calculation

  return (
    <AppLayout pageTitle="Plan & Billing">
      <Grid className={styles.container}>
        <Column lg={16} md={8} sm={4}>
          {/* Current Plan Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Current Plan</h2>
              <p className={styles.sectionDescription}>
                You are currently on the {currentPlan?.name} plan.
              </p>
            </div>

            <div className={styles.currentPlanCard}>
              <div className={styles.currentPlanHeader}>
                <div className={styles.currentPlanInfo}>
                  <h3 className={styles.currentPlanName}>{currentPlan?.name}</h3>
                  <p className={styles.currentPlanPrice}>{currentPlan?.price}</p>
                  <Tag type="green" size="sm">Current Plan</Tag>
                </div>
                <div className={styles.currentPlanActions}>
                  <Button kind="secondary" size="sm" renderIcon={Receipt}>
                    View Invoices
                  </Button>
                  <Button kind="secondary" size="sm" renderIcon={Download}>
                    Download Receipt
                  </Button>
                </div>
              </div>
              <p className={styles.currentPlanDescription}>{currentPlan?.description}</p>
            </div>
          </section>

          {/* Billing Toggle */}
          <section className={styles.section}>
            <div className={styles.billingToggle}>
              <div className={styles.toggleOptions}>
                <button
                  className={`${styles.toggleOption} ${!isAnnual ? styles.active : ''}`}
                  onClick={() => setIsAnnual(false)}
                >
                  Monthly
                </button>
                <button
                  className={`${styles.toggleOption} ${isAnnual ? styles.active : ''}`}
                  onClick={() => setIsAnnual(true)}
                >
                  Annual
                  <Tag type="green" size="sm" className={styles.savingsTag}>
                    Save {savingsPercentage}%
                  </Tag>
                </button>
              </div>
            </div>
          </section>

          {/* Plans Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Available Plans</h2>
              <p className={styles.sectionDescription}>
                Choose the plan that best fits your organization's needs.
              </p>
            </div>

            <div className={styles.plansGrid}>
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`${styles.planCard} ${plan.popular ? styles.popular : ''} ${plan.current ? styles.current : ''}`}
                >
                  {plan.popular && (
                    <div className={styles.popularBadge}>
                      <Star size={16} />
                      Most Popular
                    </div>
                  )}

                  <div className={styles.planHeader}>
                    <h3 className={styles.planName}>{plan.name}</h3>
                    <div className={styles.planPrice}>
                      {isAnnual ? plan.priceAnnual : plan.price}
                    </div>
                    <p className={styles.planDescription}>{plan.description}</p>
                  </div>

                  <div className={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <div key={index} className={styles.planFeature}>
                        {feature.included ? (
                          <Checkmark size={16} className={styles.featureIncluded} />
                        ) : (
                          <Close size={16} className={styles.featureNotIncluded} />
                        )}
                        <span className={`${styles.featureName} ${!feature.included ? styles.disabled : ''}`}>
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.planAction}>
                    {plan.current ? (
                      <Tag type="green" size="md">Current Plan</Tag>
                    ) : (
                      <Button
                        kind={plan.popular ? 'primary' : 'secondary'}
                        size="md"
                        onClick={() => handleUpgrade(plan)}
                        renderIcon={Purchase}
                      >
                        {plan.price === 'Free' ? 'Downgrade' : 'Upgrade'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Billing Information */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Billing Information</h2>
              <p className={styles.sectionDescription}>
                Manage your payment methods and billing details.
              </p>
            </div>

            <div className={styles.billingInfo}>
              <Tile className={styles.billingTile}>
                <div className={styles.billingHeader}>
                  <Money size={24} />
                  <h3>Payment Method</h3>
                </div>
                <p>**** **** **** 4242 (Visa)</p>
                <p>Expires 12/25</p>
                <Button kind="tertiary" size="sm">Update Payment Method</Button>
              </Tile>

              <Tile className={styles.billingTile}>
                <div className={styles.billingHeader}>
                  <Receipt size={24} />
                  <h3>Next Billing Date</h3>
                </div>
                <p>December 15, 2024</p>
                <p>Amount: Free</p>
                <Button kind="tertiary" size="sm">View Billing History</Button>
              </Tile>
            </div>
          </section>
        </Column>
      </Grid>

      {/* Upgrade Confirmation Modal */}
      <Modal
        open={isUpgradeModalOpen}
        onRequestClose={() => setIsUpgradeModalOpen(false)}
        modalHeading={`Upgrade to ${selectedPlan?.name}`}
        primaryButtonText="Confirm Upgrade"
        secondaryButtonText="Cancel"
        onRequestSubmit={handleConfirmUpgrade}
        size="sm"
      >
        <p>
          Are you sure you want to upgrade to the {selectedPlan?.name} plan?
        </p>
        {selectedPlan && (
          <div className={styles.upgradeDetails}>
            <p><strong>Price:</strong> {isAnnual ? selectedPlan.priceAnnual : selectedPlan.price}</p>
            <p><strong>Billing:</strong> {isAnnual ? 'Annual' : 'Monthly'}</p>
            <InlineNotification
              kind="info"
              title="Demo Mode"
              subtitle="This is a demonstration. No actual payment will be processed."
              hideCloseButton
            />
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};

export default Plan; 