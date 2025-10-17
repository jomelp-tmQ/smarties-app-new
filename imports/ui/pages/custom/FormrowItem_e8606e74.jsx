import React from 'react';
import FormcontrolItem_b5c12d0a from './FormcontrolItem_b5c12d0a';

const FormrowItem_e8606e74 = ({
  label,
  name,
  dataName,
  placeholder,
  type,
  id,
  value,
  onChange = () => { }
}) => {
  return (
    <div className={'form-row'}>
      <FormcontrolItem_b5c12d0a
        label={label}
        name={name}
        dataName={dataName}
        placeholder={placeholder}
        type={type}
        id={id}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default FormrowItem_e8606e74;
