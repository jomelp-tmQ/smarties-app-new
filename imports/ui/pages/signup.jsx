import React from 'react';

const Signup = () => {
  return (
    <div className="page-wrap-signin">
  <div className="signin-center">
    <a href="#" className="logo_link-style1 w-inline-block" tmq="tmq-0001"><img loading="lazy" src="/images/smarties_logo-temp-330.svg" alt className="image" /></a>
    <div className="sign-hd-div">
      <div className="signin-hd">Registration</div>
    </div>
    <div className="siginin-div">
      <div className="signin-formblock w-form">
        <form id="wf-form-signup-form" name="wf-form-signup-form" data-name="signup form" method="get" data-wf-page-id="68a6ed699293ec31a61d4e81" data-wf-element-id="b21b4a3a-83ae-00ae-1a33-08f1f2dc2b96">
          <div className="form-row">
            <div className="form-control">
              <div className="form-label">Email</div><input className="textfield w-input" maxLength={256} name="email" data-name="email" placeholder="Enter Email" type="email" id="email" tmq="tmq-0002" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-control">
              <div className="form-label">Password</div><input className="textfield w-input" maxLength={256} name="password" data-name="password" placeholder="Enter Password" type="password" id="password" tmq="tmq-0003" />
            </div>
          </div>
          <div className="signin-formbtn-div">
            <a href="index.html" className="btn-style1 w-inline-block" tmq="tmq-0004">
              <div>Sign In</div>
            </a>
            <a href="#" className="btn-style1 google w-inline-block" tmq="tmq-0005">
              <div className="icon-google"><img width={24} height={24} alt src="https://cdn.prod.website-files.com/681a00468b98375f74c9201b/681dfb6cc64fea67576e16eb_Social-icon.svg" loading="lazy" className="social-icon" /></div>
              <div>Sign in with Google</div>
            </a>
            <div className="upgrade-divblock">
              <div className="upgrade-left">
                <div className="icon-pro-div large"><img width={16} height={17} alt src="https://cdn.prod.website-files.com/681a00468b98375f74c9201b/681dfb6ca163bc3e95043ff6_681a00468b98375f74c921e4_%F0%9F%92%8E-1.png" loading="lazy" className="icon-pro" /></div>
                <div className="btn-text-style1">Pro users enjoy voice AI automation, custom Smarties, and analytics.</div>
              </div>
              <div className="upgrade-right">
                <a href="#" className="link-style2" tmq="tmq-0006">Upgrade after Login</a>
              </div>
            </div>
          </div>
          <div className="form-row-small">
            <div className="signup-cta-text">Already have an account?</div>
            <a href="login.html" className="link-style2" tmq="tmq-0007">Sign In</a>
          </div>
        </form>
        <div className="w-form-done">
          <div>Thank you! Your submission has been received!</div>
        </div>
        <div className="w-form-fail">
          <div>Oops! Something went wrong while submitting the form.</div>
        </div>
      </div>
    </div>
  </div>
</div>

  );
};

export default Signup;
