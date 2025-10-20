import React from 'react';
import FormcontrolItem_a0eb59b2 from './FormcontrolItem_a0eb59b2';

const FormrowItem_ca5d0667 = ({ label, name, dataName, type, id, value = "", onChange = () => { } }) => {
  return (
    <div className={'form-row'}>
      <FormcontrolItem_a0eb59b2
        label={label}
        name={name}
        dataName={dataName}
        type={type}
        id={id}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default FormrowItem_ca5d0667;
