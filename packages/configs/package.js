Package.describe({
  name: 'tmq:configs',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('3.0.4');

  // ============= CORE DEPENDENCIES =============
  api.use([
    'ecmascript',
  ]);
  // ============= COMMON FILES =============
  api.addFiles([
    'lib/Const.js',
  ], 'client', 'server');

  // ============= CLIENT FILES =============
  api.addFiles([
    'client/main.js',
  ], 'client');

  // ============= SERVER FILES =============
  api.addFiles([
    'server/main.js',
    'server/methods.js',
  ], 'server');

  // Client-only exports
  api.export([
    'Configs'
  ], 'client');

  // Server-only exports
  api.export([
  ], 'server');
});

Package.onTest(function (api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('tmq:configs');
  api.mainModule('configs-tests.js');
});
