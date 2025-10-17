import React from 'react';

const FormcontrolItem_b5c12d0a = ({
  label,
  name,
  dataName,
  placeholder,
  type,
  id,
  value,
  onChange
}) => {
  return (
    <div className={'form-control'}>
      <div className={'form-label'}>{label || 'Email'}</div>
      <input
        className={'textfield w-input'}
        maxlength={'256'}
        name={name || 'email'}
        data-name={dataName || 'email'}
        placeholder={placeholder || 'Enter Email'}
        type={type || 'email'}
        id={id || 'email'}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default FormcontrolItem_b5c12d0a;
