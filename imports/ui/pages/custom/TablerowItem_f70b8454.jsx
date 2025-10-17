import React from 'react';
import TablecelldivItem_5bb95123 from './TablecelldivItem_5bb95123';
import TablecelldivItem_ffe7f842 from './TablecelldivItem_ffe7f842';
import TablecelldivItem_bd2b767e from './TablecelldivItem_bd2b767e';
import moment from 'moment';

const TablerowItem_f70b8454 = ({ file, onClick = () => { }, isCurrent = false }) => {
  return (
    <div className={'table-row'} onClick={onClick} style={{ backgroundColor: isCurrent && "#e1d5d1" }}>
      <TablecelldivItem_5bb95123 name={file.originalName} />
      <TablecelldivItem_ffe7f842 label={file.size} />
      <TablecelldivItem_ffe7f842 label={file.status} />
      <TablecelldivItem_ffe7f842 label={file.kbStatus} />
      <TablecelldivItem_ffe7f842 label={moment(file.createdAt).format('MM/DD/YYYY')} />
      <TablecelldivItem_bd2b767e />
    </div>
  );
};

export default TablerowItem_f70b8454;
