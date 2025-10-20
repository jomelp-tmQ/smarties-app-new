import React from 'react';

const UrlitemItem = ({ dataWId, urlName, currentSelected, onClick = () => { } }) => {

  function extractDomain(url) {
    if (!url) return null;
    try {
      const { hostname } = new URL(url); // e.g. "www.key.com"
      // Remove subdomains like "www." and return only "domain.tld"
      const parts = hostname.split('.');
      if (parts.length > 2) {
        return parts.slice(-2).join('.'); // e.g. "key.com"
      }
      return hostname; // already a plain domain
    } catch (err) {
      console.error("Invalid URL:", err.message);
      return null;
    }
  }

  return (
    <a
      style={{ backgroundColor: currentSelected && "#e1d5d1" }}
      data-w-id={dataWId || '9bba86ca-9be5-99ad-ceca-b591f883646d'}
      href={'#'}
      className={'url-item w-inline-block'}
      onClick={onClick}
    >
      <div className={'url-icon'}>
        <img
          loading={'lazy'}
          src={'images/smarties-icon-url-01.svg'}
          alt={''}
        />
      </div>
      <div>{extractDomain(urlName) || ""}</div>
    </a>
  );
};

export default UrlitemItem;
