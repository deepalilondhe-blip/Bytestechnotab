/**
 * Configuration file for Bytes Automation Script.
 * Defines CSS selectors and settings for updating the WordPress admin panel
 * and verifying the frontend.
 */

export const config = {
  // WordPress Admin Selector Configuration
  // If the admin uses ACF (Advanced Custom Fields), specify the field name or ID selectors here.
  // Playwright can locate elements by:
  // - CSS selector (e.g. '#acf-field-banner_title')
  // - XPath
  // - Label text (e.g. 'Banner Section Title')
  selectors: {
    // Login selectors
    loginUser: '#user_login',
    loginPass: '#user_pass',
    loginSubmit: '#wp-submit',

    // WordPress Admin Page edit fields
    // Structure matches the parsed sections. You can update these with actual selectors once verified.
    fields: {
      banner: {
        title: { label: 'Banner Section Title:', selector: '#acf-field_66793d9793cee-row-0-field_66793e870f36c' },
        subtitle: { label: 'Banner Section Sub Title:', selector: '#acf-field_66793d9793cee-row-0-field_66793ebe60bdb' },
        bottomRightTitle: { label: 'Banner Section Banner Bottom Right Title:', selector: '#acf-field_66793d9793cee-row-0-field_667a73a31f078' }
      },
      buildMvp: {
        leftTitle: { label: 'Build MVP Section Left Title:', selector: '#acf-field_66793d9793cee-row-1-field_66ec15dcb7ec8' },
        leftSubtitle: { label: 'Build MVP Section Left Subtitle:', selector: '#acf-field_66793d9793cee-row-1-field_66ec15e3b7ec9' },
        rightTitle: { label: 'Build MVP Section Right Title:', selector: '#acf-field_66793d9793cee-row-1-field_66ec1649b7ecd' }
      },
      serviceInclude: {
        title: { label: 'Service Include Section Title:', selector: '#acf-field_66793d9793cee-row-2-field_667a746d00363' },
        subtitle: { label: 'Service Include Section Subtitle:', selector: '#acf-field_66793d9793cee-row-2-field_667a747400364' }
      },
      weFollow: {
        title: { label: 'We follow section Title:', selector: '#acf-field_66793d9793cee-row-3-field_66828b6e34ad0' },
        subtitle: { label: 'We follow section Subtitle:', selector: '#acf-field_66793d9793cee-row-3-field_66828b7334ad1' }
      },
      stepProcess: {
        title: { label: 'Step Process Section Title:', selector: '#acf-field_66793d9793cee-row-6-field_6a46079e8db41' },
        description: { label: 'Step Process Section Description:', selector: '#acf-field_66793d9793cee-row-6-field_6a4607c98db42' }
      },
      weCover: {
        title: { label: 'We cover section Title:', selector: '#acf-field_66793d9793cee-row-10-field_6679491d3ddc9' },
        subtitle: { label: 'We cover section Subtitle:', selector: '#acf-field_66793d9793cee-row-10-field_66829964303d3' }
      },
      technologies: {
        title: { label: 'Technologies We work section Title:', selector: '#acf-field_66793d9793cee-row-11-field_667d464d337c1' }
      }
    },
    saveButton: '#publish, #save-post' // WordPress publish or save draft button
  },

  // Playwright configuration options
  options: {
    headless: false, // Run browser in headed mode to see progress
    timeout: 30000,  // Standard timeout for actions (30s)
    screenshotDir: './screenshots' // Directory to save debugging screenshots
  }
};
