import React from 'react';
import FormcelldivItem_bbf56a95 from './FormcelldivItem_bbf56a95';

const Formrow2Item_b59a88f2 = ({ id, name, dataName, value = "", onChange = () => { } }) => {
  return (
    <div className={'form-row-2 prompt'}>
      <FormcelldivItem_bbf56a95
        id={id}
        name={name}
        dataName={dataName}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default Formrow2Item_b59a88f2;
