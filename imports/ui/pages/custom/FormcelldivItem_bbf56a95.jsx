import React from 'react';
import SystemprompttextareaItem from './SystemprompttextareaItem';

const FormcelldivItem_bbf56a95 = ({ id, name, dataName, value, onChange }) => {
  return (
    <div className={'form--cell-div'}>
      <label htmlFor={''} className={'form-label-2'}>
        {'System Prompt'}
      </label>
      <SystemprompttextareaItem
        id={id}
        name={name}
        dataName={dataName}
        placeholder={
          "Welcome, Leo! You are the friendly and helpful voice of SmartHome Innovations, here to assist customers with their smart home devices. Your main task is to provide support through audio interactions, answering questions, troubleshooting problems, offering advice, and making product recommendations. Remember, customers can't see you, so your words need to paint the picture clearly and warmly."
        }
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default FormcelldivItem_bbf56a95;
