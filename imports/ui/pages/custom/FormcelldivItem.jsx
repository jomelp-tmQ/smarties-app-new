import React from 'react';

const FormcelldivItem = ({ label, name, dataName, placeholder, id, value = "", onChange = () => { } }) => {
  return (
    <div className={'form--cell-div'}>
      <label htmlFor={''} className={'form-label-2'}>
        {label || 'Assistant Name'}
      </label>
      <div className={'form-control-2'}>
        <input
          className={'form-input w-input'}
          maxlength={'256'}
          name={name || 'Assistant-Name'}
          data-name={dataName || 'Assistant Name'}
          placeholder={placeholder || 'Leo'}
          type={'text'}
          id={id || 'Assistant-Name'}
          required
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export default FormcelldivItem;
