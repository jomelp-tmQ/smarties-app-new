import React from 'react';
import SelectfieldItem from './SelectfieldItem';

const FormcelldivItem_57b299e3 = ({
  label,
  id,
  name,
  dataName,
  value,
  optionText,
  optionText1,
  options,
  onChange,
}) => {
  return (
    <div className={'form--cell-div'}>
      <label htmlFor={''} className={'form-label-2'}>
        {label || 'Provider'}
      </label>
      <div className={'form-control-2'}>
        <SelectfieldItem
          id={id}
          name={name}
          dataName={dataName}
          value={value}
          optionText={optionText}
          optionText1={optionText1}
          options={options}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export default FormcelldivItem_57b299e3;
