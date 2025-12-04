import React from 'react';

const ReportingProgressBar: React.FC<{ step: number }> = ({ step }) => (
  <div className="flex justify-center items-center gap-2 mb-6">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i <= step ? 'w-8 bg-orange-500' : 'w-2 bg-stone-200'}`}></div>
    ))}
  </div>
);

export default ReportingProgressBar;
