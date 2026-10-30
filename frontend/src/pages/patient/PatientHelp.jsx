import React from 'react';
import HelpButton from '../../components/HelpButton';

const PatientHelp = () => {
  return (
    <div className="container py-5 patient-view text-center">
      <div className="card patient-card p-5 shadow-lg border-danger mx-auto" style={{ maxWidth: '700px' }}>
        <i className="bi bi-bell-fill display-1 text-danger mb-3"></i>
        <h1 className="fw-extrabold text-danger display-4 mb-3">Immediate Caregiver Assistance</h1>
        <p className="fs-3 text-secondary mb-4">
          Press the large red button below if you need help or want your caregiver to contact you immediately.
        </p>

        <div className="my-4">
          <HelpButton />
        </div>

        <p className="fs-5 text-muted mt-3">
          Your request will be sent to your caregiver's dashboard instantly.
        </p>
      </div>
    </div>
  );
};

export default PatientHelp;
