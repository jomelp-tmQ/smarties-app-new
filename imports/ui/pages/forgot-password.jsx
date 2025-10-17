import React from 'react';

const ForgotPassword = () => {
  return (
    <div className="page-wrap-signin">
  <div className="reset-center">
    <div className="forgot-password">
      <div className="sign-hd-div">
        <div className="signin-hd">Forgot your password?</div>
        <div className="signup-cta-text">Enter your email address and we'll send you a link to reset your password.</div>
      </div>
      <div className="siginin-div">
        <div className="signin-formblock w-form">
          <form id="wf-form-forgot-password-form" name="wf-form-forgot-password-form" data-name="forgot password form" method="get" data-wf-page-id="68a6ed699293ec31a61d4e82" data-wf-element-id="d2813588-93bc-24f7-b8de-ce2a8d4e5e31">
            <div className="form-row">
              <div className="form-control">
                <div className="form-label">Email</div><input className="textfield w-input" maxLength={256} name="email-2" data-name="Email 2" placeholder="Enter Email" type="email" id="email-2" tmq="tmq-0001" />
              </div>
            </div>
            <div className="signin-formbtn-div">
              <a data-w-id="d2813588-93bc-24f7-b8de-ce2a8d4e5e3d" href="#" className="btn-style1 w-inline-block">
                <div>Send Reset Link</div>
              </a>
            </div>
            <div className="form-row-small">
              <div className="signup-cta-text">Remember your password?</div>
              <a href="login.html" className="link-style2" tmq="tmq-0002">Sign In</a>
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
    <div className="reset-link-sent">
      <div className="sign-hd-div">
        <div className="signin-icon"><img src="/images/Send.svg" loading="lazy" alt className="image-100" /></div>
        <div className="signin-hd">Check your email</div>
        <div className="signup-cta-text">We've sent a password reset link to <strong>your@email.com</strong>.</div>
        <div className="signup-cta-text">The link will expire in 30 minutes.</div>
      </div>
      <div className="siginin-div">
        <div className="signin-formbtn-div">
          <a href="reset-password.html" className="btn-style1 w-inline-block" tmq="tmq-0003">
            <div>Resend Email</div>
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

  );
};

export default ForgotPassword;
