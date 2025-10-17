import React, { useRef, useState } from 'react';
import FormrowItem_e8606e74 from '../custom/FormrowItem_e8606e74';
import { useNavigate } from 'react-router-dom';
import Client from '../../../api/client/Client';
import { toast } from "sonner";
import { TOAST_STYLE } from '../../../api/common/const';
import { Toaster } from 'sonner';
import { Logger } from '@tmq-dev-ph/tmq-dev-core-client';

const Login = () => {
  // const watcher = useRef(BillingWatcher).current;
  // useWatcher(watcher);
  const formRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSmartiesFreePlan = async (email) => {
    if (!email) {
      toast.error('There was an error logging in, please try again', {
        style: TOAST_STYLE.ERROR
      });
      return;
    }

    try {
      setIsLoading(true);

      const user = await watcher.fetchAccountDetails(email);

      if (user?.customerid) {
        window.location.reload();
      } else {
        const url = await watcher.handleSmartiesFreePlan(user || null);
        window.location.href = url;
      }

    } catch (err) {
      Logger.showError("Smarties Plan Error", err);
      toast.error("Something went wrong while processing the plan", {
        style: TOAST_STYLE.ERROR
      });
    } finally {
      // Only unset loading if no redirect happened
      // If redirect happens, this line won't execute anyway
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = await Client.loginWithPassword(email, password);
      if (user._id) {
        toast.success('Login Successfully', {
          style: TOAST_STYLE.SUCCESS
        });
        navigate('/');
      } else {
        toast.error('Login failed, please check your email and password', {
          style: TOAST_STYLE.ERROR
        });
      }
      // await handleSmartiesFreePlan(user?.email);
    } catch (err) {
      setError(err.message || "Login failed, please check your email and password");
      Logger.showError("Login failed", err);
      toast.error('Login failed, please check your email and password', {
        style: TOAST_STYLE.ERROR
      });
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };
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
            <div className={'signin-hd'}>{'Login'}</div>
            <div className={'sign-subhd'}>
              {'Welcome back! Please enter your details.'}
            </div>
          </div>
          <div className={'siginin-div'}>
            <div className={'signin-formblock w-form'}>
              <form
                id={'wf-form-login-form'}
                name={'wf-form-login-form'}
                data-name={'login form'}
                method={'get'}
                data-wf-page-id={'688b61ee631f6165f14725b6'}
                data-wf-element-id={'86a1b823-6722-4912-718e-32f306ade401'}
              >
                <FormrowItem_e8606e74
                  label={'Email'}
                  name={'email'}
                  dataName={'email'}
                  placeholder={'Enter Email'}
                  type={'email'}
                  id={'email'}
                  value={email}
                  onChange={handleEmailChange}
                />
                <FormrowItem_e8606e74
                  label={'Password'}
                  name={'password'}
                  dataName={'password'}
                  placeholder={'Enter Password'}
                  type={'password'}
                  id={'password'}
                  value={password}
                  onChange={handlePasswordChange}
                />
                {/* <div className={'form-row horizontal'}>
                  <label className={'w-checkbox remember-checkfield'}>
                    <input
                      type={'checkbox'}
                      name={'check-remember-account'}
                      id={'check-remember-account'}
                      data-name={'check remember account'}
                      className={'w-checkbox-input'}
                    />
                    <span
                      className={'checkbox-text w-form-label'}
                      htmlFor={'check-remember-account'}
                    >
                      {'Remember for 30 days'}
                    </span>
                  </label>
                  <a href={'forgot-password.html'} className={'link-style2'}>
                    {'Forgot Password'}
                  </a>
                </div> */}
                <div className={'signin-formbtn-div'}>
                  <button onClick={handleLogin} className="btn-style1 w-inline-block">
                    <div>Sign In</div>
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
                  </a>
                  <a href={'#'} className={'btn-trypro w-inline-block'}>
                    <div className={'btn-center'}>
                      <div className={'btn-text-style1'}>
                        {'Already on Lite? '}
                      </div>
                      <div className={'btn-text-style2'}>{'Try Pro'}</div>
                      <div className={'icon-pro-div'}>
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
                    </div>
                  </a> */}
                </div>
                <div className={'form-row-small'}>
                  <div className={'signup-cta-text'}>
                    {"Don't have an account?"}
                  </div>
                  <button onClick={() => navigate('/signup')} className="link-style2">Sign Up</button>
                </div>
              </form>
              <div className={'w-form-done'}>
                <div>{'Thank you! Your submission has been received!'}</div>
              </div>
              <div className={'w-form-fail'} style={{ display: error ? 'block' : 'none' }}>
                <div>
                  <div>{error}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
};

export default Login;
