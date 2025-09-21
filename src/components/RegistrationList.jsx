import React, { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const RegistrationList = ({ registrations, onSelectRegistration, onDeleteRegistration, isLoading }) => {
  const [deleteId, setDeleteId] = useState(null);

  const handleDelete = (id, event) => {
    event.stopPropagation();
    setDeleteId(id);
    onDeleteRegistration(id);
  };
  
  // Reset deleteId when registrations change
  useEffect(() => {
    setDeleteId(null);
  }, [registrations]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!registrations || registrations.length === 0) {
    return <p>No registrations found.</p>;
  }

  return (
    <ul className="registration-list">
      {registrations.map((registration) => (
        <li 
          key={registration.id} 
          className={`registration-item ${deleteId === registration.id ? 'deleting' : ''}`}
          onClick={() => onSelectRegistration(registration)}
        >
          <span>{registration.name}</span>
          <button
            className="delete-btn"
            onClick={(e) => handleDelete(registration.id, e)}
            disabled={deleteId === registration.id}
          >
            {deleteId === registration.id ? '...' : '×'}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default RegistrationList;