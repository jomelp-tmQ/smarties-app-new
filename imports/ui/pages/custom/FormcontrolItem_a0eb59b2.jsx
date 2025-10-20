import React from 'react';

const FormcontrolItem_a0eb59b2 = ({ label, name, dataName, type, id, value, onChange }) => {
  return (
    <div className={'form-control'}>
      <div className={'form-label'}>{label || 'Domain'}</div>
      <input
        className={'form-input w-input'}
        maxlength={'256'}
        name={name || 'domain-name'}
        data-name={dataName || 'domain name'}
        placeholder={''}
        type={type || 'url'}
        id={id || 'domain-name-2'}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default FormcontrolItem_a0eb59b2;
