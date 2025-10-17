import React from 'react';

const SelectfieldItem = ({
  id,
  name,
  dataName,
  value,
  optionText,
  optionText1,
  options = [],
  onChange = () => { },
  selection = "model"
}) => {
  return (
    <select id={id || "Provider"} name={name || "Provider"} data-name={dataName || "Provider"} className="select-field w-select" value={value} onChange={onChange}>
      {options.map((option, index) => {
        return (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        );
      }
      )}
    </select>
  );
};

export default SelectfieldItem;
