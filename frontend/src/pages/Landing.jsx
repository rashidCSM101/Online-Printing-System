import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiCheckCircle,
  FiLayers,
  FiPrinter,
  FiShield,
  FiTruck,
  FiZap,
} from 'react-icons/fi';
import './Landing.css';

const featureCards = [
  {
    icon: <FiZap />,
    label: 'Fast Turnaround',
    title: 'Ready-to-print queue with rapid processing',
    description:
      'Jobs are routed quickly so urgent files can move from upload to print with minimal waiting.',
  },
  {
    icon: <FiShield />,
    label: 'Secure Files',
    title: 'Your documents stay protected and private',
    description:
      'Secure handling and controlled access keep personal and academic files safe throughout the flow.',
  },
  {
    icon: <FiLayers />,
    label: 'Flexible Options',
    title: 'Control quality, paper, and output details',
    description:
      'Configure print settings with clarity and confidence before placing any order.',
  },
  {
    icon: <FiTruck />,
    label: 'Reliable Delivery',
    title: 'Doorstep service with transparent status',
    description:
      'Track each stage from confirmation to dispatch with dependable local delivery support.',
  },
];

const workflowSteps = [
  {
    title: 'Upload Your Document',
    description: 'Submit PDF, DOCX, or image files from any device in seconds.',
  },
  {
    title: 'Choose Print Settings',
    description: 'Select paper, color mode, sides, and quantity before checkout.',
  },
  {
    title: 'Confirm And Pay',
    description: 'Review pricing clearly and place the order with a smooth checkout flow.',
  },
  {
    title: 'Track And Receive',
    description: 'Monitor status updates and receive your prints at your selected location.',
  },
];

const trustMetrics = [
  { value: '15 min', label: 'Avg. processing time' },
  { value: '98%', label: 'On-time fulfillment' },
  { value: '24/7', label: 'Order placement access' },
];

const promisePoints = [
  'Professional output quality',
  'Transparent order status',
  'Secure file handling',
  'Campus-friendly delivery',
];

const riseIn = {
  hidden: { opacity: 0, y: 30 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay },
  }),
};

const Landing = () => {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-grid-overlay" aria-hidden="true" />
        <div className="container hero-shell">
          <motion.div
            className="hero-content"
            initial="hidden"
            animate="show"
            variants={riseIn}
            custom={0}
          >
            <span className="eyebrow">Professional Online Printing</span>
            <h1 className="hero-title">From Upload To Doorstep In One Smooth Flow</h1>
            <p className="hero-subtitle">
              Printsy helps students and teams place high-quality print jobs online with secure handling,
              clear pricing, and dependable delivery.
            </p>

            <ul className="hero-promise-list">
              {promisePoints.map((point) => (
                <li key={point}>
                  <FiCheckCircle className="promise-icon" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-primary btn-large">
                Start Printing <FiArrowRight />
              </Link>
              <Link to="/login" className="btn btn-outline btn-large">
                Sign In
              </Link>
            </div>

            <div className="hero-metrics">
              {trustMetrics.map((metric) => (
                <div key={metric.label} className="metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.18 }}
          >
            <div className="hero-image-shell">
              <div className="hero-image-glow" aria-hidden="true" />
              <img
                src="/images-removebg-preview.png"
                alt="Printer ready for document printing"
                className="hero-printer-image"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Why Teams Choose Printsy</p>
            <h2 className="section-title">A reliable print workflow built for real deadlines</h2>
          </div>

          <div className="features-grid">
            {featureCards.map((feature, index) => (
              <motion.article
                key={feature.title}
                className="feature-card"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={riseIn}
                custom={index * 0.08}
              >
                <div className="feature-top">
                  <span className="feature-icon">{feature.icon}</span>
                  <span className="feature-label">{feature.label}</span>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Simple Process</p>
            <h2 className="section-title">How your order moves from file to final print</h2>
          </div>

          <div className="steps">
            {workflowSteps.map((step, index) => (
              <motion.div
                key={step.title}
                className="step"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.35 }}
                variants={riseIn}
                custom={index * 0.1}
              >
                <span className="step-index">{`0${index + 1}`}</span>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <motion.div
            className="cta-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            viewport={{ once: true }}
          >
            <p className="eyebrow">Ready To Print</p>
            <h2 className="cta-title">Upgrade your document workflow with Printsy</h2>
            <p className="cta-description">
              Create an account, upload your first file, and experience a cleaner and faster print journey.
            </p>
            <div className="cta-actions">
              <Link to="/signup" className="btn btn-primary btn-large">
                Create Free Account <FiArrowRight />
              </Link>
              <a href="#features" className="cta-link">
                Explore features
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-row">
          <span className="footer-brand">
            <FiPrinter /> Printsy
          </span>
          <p>2026 Printsy. Crafted for students, offices, and fast-moving teams.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
