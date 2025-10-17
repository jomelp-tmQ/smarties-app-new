import React from 'react';

const ResetPassword = () => {
  return (
    <div className="page-wrap-signin">
  <div className="reset-center">
    <div className="reset-password">
      <div className="sign-hd-div">
        <div className="signin-hd">Reset password</div>
        <div className="signup-cta-text">Please create a new secure password for your account.</div>
      </div>
      <div className="siginin-div">
        <div className="signin-formblock w-form">
          <form id="wf-form-reset-password-form" name="wf-form-reset-password-form" data-name="reset password form" method="get" data-wf-page-id="68a6ed699293ec31a61d4e83" data-wf-element-id="139ff807-3ea3-2584-93b9-1c985bf00930">
            <div className="form-row">
              <div className="form-control">
                <div className="form-label">New Password</div><input className="textfield w-input" maxLength={256} name="new-password" data-name="new password" placeholder type="password" id="new-password" tmq="tmq-0001" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-control">
                <div className="form-label">Confirm New Password</div><input className="textfield w-input" maxLength={256} name="confirm-new-password" data-name="confirm new password" placeholder type="password" id="confirm-new-password" tmq="tmq-0002" />
              </div>
            </div>
            <div className="signin-formbtn-div">
              <a data-w-id="139ff807-3ea3-2584-93b9-1c985bf00937" href="#" className="btn-style1 w-inline-block">
                <div>Reset Password</div>
              </a>
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
    <div className="reset-password-success">
      <div className="sign-hd-div">
        <div className="signin-icon"><img src="/images/smarties-login-check.svg" loading="lazy" alt className="image-100" /></div>
        <div className="signin-hd">Password Changed!</div>
        <div className="signup-cta-text">Your password has been changed successfully.</div>
      </div>
      <div className="siginin-div">
        <div className="signin-formbtn-div">
          <a href="login.html" className="btn-style1 w-inline-block" tmq="tmq-0003">
            <div>Back to Login</div>
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

  );
};

export default ResetPassword;
