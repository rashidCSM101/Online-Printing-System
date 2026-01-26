import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPrinter, FiZap, FiShield, FiTruck, FiArrowRight } from 'react-icons/fi';
import './Landing.css';

const Landing = () => {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <FiZap />,
      title: 'Fast Printing',
      description: 'Get your documents printed in minutes with our quick service'
    },
    {
      icon: <FiShield />,
      title: 'Secure & Safe',
      description: 'Your documents are protected with end-to-end encryption'
    },
    {
      icon: <FiTruck />,
      title: 'Home Delivery',
      description: 'We deliver your printed documents right to your doorstep'
    },
    {
      icon: <FiPrinter />,
      title: 'Quality Print',
      description: 'High-quality printing with color and black & white options'
    }
  ];

  return (
    <div className="landing">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="hero-title">
              Print Your Documents
              <span className="gradient-text"> Online</span>
            </h1>
            <p className="hero-subtitle">
              Fast, secure, and reliable online printing service with home delivery.
              Upload your files and get them printed in minutes!
            </p>
            <div className="hero-buttons">
              <Link to="/signup">
                <button className="btn btn-primary btn-large">
                  Get Started <FiArrowRight />
                </button>
              </Link>
              <a href="#features">
                <button className="btn btn-outline btn-large">
                  Learn More
                </button>
              </a>
            </div>
          </motion.div>

          <motion.div
            className="hero-image"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="image-placeholder">
              <FiPrinter size={120} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <h2 className="section-title animate-on-scroll">Why Choose Us?</h2>
          <p className="section-subtitle animate-on-scroll">
            We provide the best online printing experience with amazing features
          </p>

          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card card animate-on-scroll"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title animate-on-scroll">How It Works</h2>
          
          <div className="steps">
            <div className="step animate-on-scroll">
              <div className="step-number">1</div>
              <h3 className="step-title">Upload Your File</h3>
              <p className="step-description">
                Upload your document in PDF, Word, or image format
              </p>
            </div>

            <div className="step animate-on-scroll">
              <div className="step-number">2</div>
              <h3 className="step-title">Choose Options</h3>
              <p className="step-description">
                Select paper size, color mode, and number of copies
              </p>
            </div>

            <div className="step animate-on-scroll">
              <div className="step-number">3</div>
              <h3 className="step-title">Place Order</h3>
              <p className="step-description">
                Confirm your order and provide delivery address
              </p>
            </div>

            <div className="step animate-on-scroll">
              <div className="step-number">4</div>
              <h3 className="step-title">Get Delivered</h3>
              <p className="step-description">
                Receive your printed documents at your doorstep
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <motion.div
            className="cta-content animate-on-scroll"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="cta-title">Ready to Get Started?</h2>
            <p className="cta-description">
              Join thousands of satisfied customers who trust us with their printing needs
            </p>
            <Link to="/signup">
              <button className="btn btn-primary btn-large">
                Create Account Now <FiArrowRight />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2026 PrintHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
