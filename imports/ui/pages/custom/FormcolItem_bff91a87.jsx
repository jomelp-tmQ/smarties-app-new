import React from 'react';
import FormcelldivItem_57b299e3 from './FormcelldivItem_57b299e3';

const FormcolItem_bff91a87 = ({ label, id, name, dataName, optionText, options = [], value, onChange = () => { } }) => {
  return (
    <div className={'form-col'}>
      <FormcelldivItem_57b299e3
        label={label}
        id={id}
        name={name}
        dataName={dataName}
        optionText={optionText}
        optionText1={'Select one...'}
        value={value}
        options={options}
        onChange={onChange}
      />
    </div>
  );
};

export default FormcolItem_bff91a87;
