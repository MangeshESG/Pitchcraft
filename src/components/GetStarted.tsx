import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

interface GetStartedProps {
  onNavigate: (tab: string, subTab?: string) => void;
  onComplete?: (step: number) => void;
}

const GetStarted: React.FC<GetStartedProps> = ({ onNavigate, onComplete }) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'getStarted' | 'progress'>('getStarted');

  const handleStepComplete = (stepNumber: number) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps([...completedSteps, stepNumber]);
      onComplete?.(stepNumber);
    }
  };

  const steps = [
    {
      number: 1,
      title: 'Create a template',
      description: 'Contact your account manager for new pitch templates. Soon you\'ll be able to build them right in PitchKraft.',
      action: 'Create template',
      videoText: 'Video coming soon',
      onAction: () => {
        handleStepComplete(1);
        onNavigate('Template');
      }
    },
    {
      number: 2,
      title: 'Import contacts',
      description: 'Add your audience (we\'ll help map columns).',
      action: 'Import contacts',
      quickIntro: 'Watch quick intro',
      onAction: () => {
        handleStepComplete(2);
        onNavigate('DataCampaigns', 'List');
      }
    },
    {
      number: 3,
      title: 'Create a campaign',
      description: 'Pick a template + audience, then you\'re ready to send.',
      action: 'New campaign',
      quickIntro: 'Watch quick intro',
      onAction: () => {
        handleStepComplete(3);
        onNavigate('Campaigns');
      }
    },
    {
      number: 4,
      title: 'Generate emails',
      description: 'Create hyper-personalized emails for your campaigns.',
      action: 'Generate emails',
      videoText: 'Video coming soon',
      onAction: () => {
        handleStepComplete(4);
        onNavigate('Output');
      }
    },
    {
      number: 5,
      title: 'Schedule and review campaigns',
      description: 'Add email settings, set sending schedules, then check analytics for opens, clicks and replies.',
      action: 'Schedule and review campaigns',
      videoText: 'Video coming soon',
      onAction: () => {
        handleStepComplete(5);
        onNavigate('Mail', 'Schedule');
      }
    }
  ];

  const progressPercentage = (completedSteps.length / steps.length) * 100;

  return (
    <div className="get-started-container">
      {/* Tab Header */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'getStarted' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('getStarted')}
        >
          Get started
        </button>
        <button
          className={`px-4 py-2 font-medium ml-4 ${
            activeTab === 'progress' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
      </div>

      {activeTab === 'getStarted' ? (
        <>
          <h1 className="text-2xl font-bold mb-2">Get started with PitchKraft</h1>
          <p className="text-gray-600 mb-8">Send your first campaign in about 15 minutes.</p>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="text-gray-600">{completedSteps.length} of {steps.length} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step) => (
              <div 
                key={step.number} 
                className={`border rounded-lg p-6 ${
                  completedSteps.includes(step.number) ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4 flex-1">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                      ${completedSteps.includes(step.number) ? 'bg-green-500' : 'bg-gray-400'}
                    `}>
                      {completedSteps.includes(step.number) ? (
                        <FontAwesomeIcon icon={faCheckCircle} />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                      <p className="text-gray-600 mb-4">{step.description}</p>
                      <button
                        onClick={step.onAction}
                        className={`
                          px-4 py-2 rounded font-medium
                          ${completedSteps.includes(step.number) 
                            ? 'bg-gray-100 text-gray-600 border border-gray-300' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                          }
                        `}
                      >
                        {step.action}
                      </button>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    {step.quickIntro ? (
                      <button className="text-green-500 hover:text-green-600 text-sm font-medium">
                        {step.quickIntro}
                      </button>
                    ) : step.videoText && (
                      <span className="text-gray-500 text-sm">{step.videoText}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Optional Demo Section */}
          <div className="mt-12 border rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">Want to explore first?</h3>
            <p className="text-gray-600 mb-4">
              Load a safe demo workspace you can delete anytime. Demo includes sample templates, 
              dummy contacts, and a sample campaign. Go ahead and play with it.
            </p>
            <button className="bg-green-500 text-white px-6 py-2 rounded font-medium hover:bg-green-600">
              Try demo workspace
            </button>
            <span className="ml-4 text-sm text-gray-500">Optional</span>
          </div>
        </>
      ) : (
        /* Progress Tab Content */
        <div>
          <h2 className="text-xl font-bold mb-4">Your Progress</h2>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center gap-4">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${completedSteps.includes(step.number) ? 'bg-green-500 text-white' : 'bg-gray-200'}
                `}>
                  {completedSteps.includes(step.number) ? '✓' : step.number}
                </div>
                <span className={completedSteps.includes(step.number) ? 'font-medium' : 'text-gray-600'}>
                  {step.title}
                </span>
                {completedSteps.includes(step.number) && (
                  <span className="text-green-500 text-sm">Completed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GetStarted;