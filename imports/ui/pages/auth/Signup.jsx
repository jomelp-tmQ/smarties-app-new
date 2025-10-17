import React, { useRef, useState } from 'react';
import FormrowItem_e8606e74 from '../custom/FormrowItem_e8606e74';
import { useNavigate } from 'react-router-dom';
import AccountWatcher from '../../../api/client/watchers/AccountWatcher';
import { useWatcher } from '../../../api/client/Watcher2';

const Signup = () => {
  const formRef = useRef(null);
  const navigate = useNavigate()
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    accountName: ''
  });

  const watcher = useRef(AccountWatcher).current;
  useWatcher(watcher);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setIsLoading(true);
    AccountWatcher.signup(formData.email, formData.password, formData.accountName)
  }

  return (
    <>
      <div className={'page-wrap-signin'}>
        <div className={'signin-center'}>
          <a href={'#'} className={'logo_link-style1 w-inline-block'}>
            <img
              loading={'lazy'}
              src={'images/smarties_logo-temp-330.svg'}
              alt={''}
              className={'image'}
            />
          </a>
          <div className={'sign-hd-div'}>
            <div className={'signin-hd'}>{'Registration'}</div>
          </div>
          <div className={'siginin-div'}>
            <div className={'signin-formblock w-form'}>
              <form
                id={'wf-form-signup-form'}
                name={'wf-form-signup-form'}
                data-name={'signup form'}
                method={'get'}
                data-wf-page-id={'688b61ee631f6165f14725b7'}
                data-wf-element-id={'b21b4a3a-83ae-00ae-1a33-08f1f2dc2b96'}
              >
                <FormrowItem_e8606e74
                  label={'Account Name'}
                  name={'accountName'}
                  dataName={'accountName'}
                  placeholder={'Enter Account Name'}
                  type={'text'}
                  id={'accountName'}
                  value={formData.accountName}
                  onChange={handleInputChange}
                />
                <FormrowItem_e8606e74
                  label={'Email'}
                  name={'email'}
                  dataName={'email'}
                  placeholder={'Enter Email'}
                  type={'email'}
                  id={'email'}
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <FormrowItem_e8606e74
                  label={'Password'}
                  name={'password'}
                  dataName={'password'}
                  placeholder={'Enter Password'}
                  type={'password'}
                  id={'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <div className={'signin-formbtn-div'}>
                  <button onClick={handleSignup} className="btn-style1 w-inline-block">
                    <div>Sign Up</div>
                  </button>
                  {/* <a href={'#'} className={'btn-style1 google w-inline-block'}>
                    <div className={'icon-google'}>
                      <img
                        width={'24'}
                        height={'24'}
                        alt={''}
                        src={
                          'https://cdn.prod.website-files.com/681a00468b98375f74c9201b/681dfb6cc64fea67576e16eb_Social-icon.svg'
                        }
                        loading={'lazy'}
                        className={'social-icon'}
                      />
                    </div>
                    <div>{'Sign in with Google'}</div>
                  </a> */}
                  {/* <div className={'upgrade-divblock'}>
                    <div className={'upgrade-left'}>
                      <div className={'icon-pro-div large'}>
                        <img
                          width={'16'}
                          height={'17'}
                          alt={''}
                          src={
                            'https://cdn.prod.website-files.com/681a00468b98375f74c9201b/681dfb6ca163bc3e95043ff6_681a00468b98375f74c921e4_%F0%9F%92%8E-1.png'
                          }
                          loading={'lazy'}
                          className={'icon-pro'}
                        />
                      </div>
                      <div className={'btn-text-style1'}>
                        {
                          'Pro users enjoy voice AI automation, custom Smarties, and analytics.'
                        }
                      </div>
                    </div>
                    <div className={'upgrade-right'}>
                      <a href={'#'} className={'link-style2'}>
                        {'Upgrade after Login'}
                      </a>
                    </div>
                  </div> */}
                </div>
                <div className={'form-row-small'}>
                  <div className={'signup-cta-text'}>
                    {'Already have an account?'}
                  </div>
                  <button onClick={() => navigate('/login')} className="link-style2">Sign In</button>
                </div>
              </form>
              <div className={'w-form-done'}>
                <div>{'Thank you! Your submission has been received!'}</div>
              </div>
              <div className={'w-form-fail'}>
                <div>{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
