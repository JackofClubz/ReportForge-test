import React from 'react';
import { Grid, Column, Button } from '@carbon/react';
import { Headset, Email, ArrowRight } from '@carbon/icons-react';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import styles from '../../styles/pages/support/support.module.scss';

const Support: React.FC = () => {
  return (
    <AppLayout>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="Support Center" />
        </Column>
      </Grid>
      <Grid className={styles.mainGrid} condensed>
        <Column sm={4} md={8} lg={16}>
          <p className={styles.description}>
            Need help with your mining reports or site management? Our support team is here to assist you.
          </p>
        </Column>

        <Column sm={4} md={4} lg={8}>
          <div className={styles.supportCard}>
            <Headset size={32} className={`${styles.icon} ${styles.technical}`} />
            <h2 className="bx--type-productive-heading-03">Technical Support</h2>
            <p className="bx--type-body-long-01">
              Having issues with the platform? Our technical team can help resolve any problems you're experiencing.
            </p>
            <Button href="/support/technical" className={styles.cardButton}>
              Contact Tech Support
            </Button>
          </div>
        </Column>

        <Column sm={4} md={4} lg={8}>
          <div className={styles.supportCard}>
            <Email size={32} className={`${styles.icon} ${styles.general}`} />
            <h2 className="bx--type-productive-heading-03">General Inquiries</h2>
            <p className="bx--type-body-long-01">
              For questions about your subscription, billing, or general information about our services.
            </p>
            <Button kind="tertiary" href="/support/contact" className={styles.cardButton}>
              Send Email
            </Button>
          </div>
        </Column>

        <Column sm={4} md={8} lg={16}>
          <div className={styles.faqSection}>
            <h2 className="bx--type-productive-heading-03">Frequently Asked Questions</h2>
            
            <div className={styles.faqItem}>
              <h3 className="bx--type-productive-heading-02">How do I create a new mining site?</h3>
              <p className="bx--type-body-long-01">
                Navigate to the Sites section and click on "New Site" button. Fill out the required information and submit the form.
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3 className="bx--type-productive-heading-02">Can I export my reports as PDFs?</h3>
              <p className="bx--type-body-long-01">
                Yes, when viewing a report, click on the "Export" button in the top right corner and select PDF format.
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3 className="bx--type-productive-heading-02">How do I add contributors to my reports?</h3>
              <p className="bx--type-body-long-01">
                When editing a report, navigate to the "Contributors" tab and use the search function to find and add team members.
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3 className="bx--type-productive-heading-02">What mining report templates are available?</h3>
              <p className="bx--type-body-long-01">
                We currently support various industry standard templates including NI43-101 and JORC code compliant reports.
              </p>
            </div>
          </div>
        </Column>

        <Column sm={4} md={8} lg={16}>
          <div className={styles.contactFooter}>
            <h2 className="bx--type-productive-heading-03">Can't find what you're looking for?</h2>
            <p className="bx--type-body-long-01">Our support team is available Monday through Friday, 9am-5pm EST.</p>
            <Button
              href="/support/contact"
              className={styles.contactButton}
              renderIcon={ArrowRight}
            >
              Contact Us
            </Button>
          </div>
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default Support; 