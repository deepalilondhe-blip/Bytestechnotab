/**
 * Configuration file for Bytes and MIS Automation Scripts.
 * Defines CSS selectors and settings for updating the WordPress admin panel
 * and verifying the frontend.
 */

const isMIS = (process.env.WP_ADMIN_URL || '').includes('magnetoitsolutions.com');

export const config = {
  // WordPress Admin Selector Configuration
  selectors: {
    // Login selectors
    loginUser: '#user_login',
    loginPass: '#user_pass',
    loginSubmit: '#wp-submit',

    // WordPress Admin Page edit fields
    fields: isMIS ? {
      banner: {
        title: { label: 'Service Banner Title', selector: '#acf-field_6a169f2632377-row-0-field_6a1d4b0b0bf37' },
        subtitle: { label: 'Service Banner Description', selector: 'textarea[name="acf[field_6a169f2632377][row-0][field_6a1d4b0b0bf38]"]' }
      },
      buildMvp: {
        leftTitle: { label: 'List Retailer Section Title', selector: '#acf-field_6a169f2632377-row-1-field_lrs_title' },
        leftSubtitle: { label: 'List Retailer Section Bottom Description', selector: '#acf-field_6a169f2632377-row-1-field_lrs_description' }
      },
      serviceInclude: {
        title: { label: 'Core Capabilities Section Title', selector: '#acf-field_6a169f2632377-row-2-field_core_capabilities_title' },
        subtitle: { label: 'Core Capabilities Section Description', selector: 'textarea[name="acf[field_6a169f2632377][row-2][field_core_capabilities_description]"]' }
      },
      weFollow: {
        title: { label: 'Gradient Grid Section Title', selector: '#acf-field_6a169f2632377-row-3-field_ggs_heading' }
      },
      stepProcess: {
        title: { label: 'Key Benefits Section Title', selector: '#acf-field_6a169f2632377-row-4-field_6a1d8298ea4f8' },
        description: { label: 'Key Benefits Section Description', selector: 'textarea[name="acf[field_6a169f2632377][row-4][field_6a1d82a4ea4f9]"]' }
      },
      weCover: {
        title: { label: 'Case Study Card Slider V2 Section Heading', selector: '#acf-field_6a169f2632377-row-5-field_cs_v2_heading' }
      },
      technologies: {
        title: { label: 'Global AI Integration Heading', selector: '#acf-field_6a169f2632377-row-6-field_gai_heading' }
      }
    } : {
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
