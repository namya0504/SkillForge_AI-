import React from 'react';
import { Check } from 'lucide-react';
import './StepIndicator.css';

const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div className="step-indicator-container">
      <div className="step-indicator-wrapper">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <React.Fragment key={index}>
              <div className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="step-circle">
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : index + 1}
                </div>
                <span className="step-label">{step}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`step-line ${isCompleted ? 'completed' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
