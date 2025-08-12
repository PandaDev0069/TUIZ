/**
 * TUIZ Theme Demo Component
 * Demonstrates proper usage of the universal theme system
 */

import React from 'react';
import './ThemeDemo.css';

const ThemeDemo = () => {
  return (
    <div className="theme-demo">
      <div className="theme-demo__container">
        <header className="theme-demo__header">
          <h1 className="theme-demo__title">TUIZ Theme System Demo</h1>
          <p className="theme-demo__subtitle">
            Showcasing the universal purple-blue gradient design language
          </p>
        </header>

        <section className="theme-demo__cards">
          <div className="theme-demo__card theme-demo__card--primary">
            <h3>Glass Morphism Card</h3>
            <p>Beautiful frosted glass effect with backdrop blur</p>
            <button className="theme-demo__button theme-demo__button--primary">
              Primary Action
            </button>
          </div>

          <div className="theme-demo__card theme-demo__card--secondary">
            <h3>Interactive Card</h3>
            <p>Hover me to see the shimmer effect!</p>
            <button className="theme-demo__button theme-demo__button--secondary">
              Secondary Action
            </button>
          </div>

          <div className="theme-demo__card theme-demo__card--gradient">
            <h3>Gradient Card</h3>
            <p>Using semantic color gradients</p>
            <button className="theme-demo__button theme-demo__button--success">
              Success Action
            </button>
          </div>
        </section>

        <section className="theme-demo__inputs">
          <h2 className="theme-demo__section-title">Form Elements</h2>
          <div className="theme-demo__input-group">
            <input 
              type="text" 
              className="theme-demo__input" 
              placeholder="Glass morphism input field"
            />
            <input 
              type="email" 
              className="theme-demo__input" 
              placeholder="Email address"
            />
            <textarea 
              className="theme-demo__textarea" 
              placeholder="Message with glass effect"
              rows="4"
            ></textarea>
          </div>
        </section>

        <section className="theme-demo__typography">
          <h2 className="theme-demo__section-title">Typography Scale</h2>
          <div className="theme-demo__text-samples">
            <h1 className="theme-demo__text theme-demo__text--4xl">Heading 1 (4xl)</h1>
            <h2 className="theme-demo__text theme-demo__text--3xl">Heading 2 (3xl)</h2>
            <h3 className="theme-demo__text theme-demo__text--2xl">Heading 3 (2xl)</h3>
            <h4 className="theme-demo__text theme-demo__text--xl">Heading 4 (xl)</h4>
            <p className="theme-demo__text theme-demo__text--base">Body text (base)</p>
            <p className="theme-demo__text theme-demo__text--sm">Small text (sm)</p>
          </div>
        </section>

        <section className="theme-demo__animations">
          <h2 className="theme-demo__section-title">Animations</h2>
          <div className="theme-demo__animation-samples">
            <div className="theme-demo__animation-card tuiz-animate-float">
              <span>🎈 Float Animation</span>
            </div>
            <div className="theme-demo__animation-card tuiz-animate-shimmer">
              <span>✨ Shimmer on Hover</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ThemeDemo;
