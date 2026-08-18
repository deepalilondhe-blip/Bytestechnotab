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
        title: { label: 'Banner Section Title:', selector: 'input[name*="banner_title"]' },
        subtitle: { label: 'Banner Section Sub Title:', selector: 'input[name*="banner_subtitle"]' },
        bottomRightTitle: { label: 'Banner Section Banner Bottom Right Title:', selector: 'textarea[name*="banner_bottom_right"]' }
      },
      buildMvp: {
        leftTitle: { label: 'Build MVP Section Left Title:', selector: 'input[name*="mvp_left_title"]' },
        leftSubtitle: { label: 'Build MVP Section Left Subtitle:', selector: 'textarea[name*="mvp_left_subtitle"]' },
        rightTitle: { label: 'Build MVP Section Right Title:', selector: 'input[name*="mvp_right_title"]' },
        rightSubtitle: { label: 'Build MVP Section Right Subtitle:', selector: 'textarea[name*="mvp_right_subtitle"]' }
      },
      serviceInclude: {
        title: { label: 'Service Include Section Title:', selector: 'input[name*="service_include_title"]' },
        subtitle: { label: 'Service Include Section Subtitle:', selector: 'textarea[name*="service_include_subtitle"]' },
        // Repeater fields can be addressed dynamically in automation.js
        services: {
          container: '.acf-field-repeater[data-name="services"]',
          title: 'input[name*="service_title"]',
          subtitle: 'textarea[name*="service_subtitle"]'
        }
      },
      weFollow: {
        title: { label: 'We follow section Title:', selector: 'input[name*="we_follow_title"]' },
        subtitle: { label: 'We follow section Subtitle:', selector: 'textarea[name*="we_follow_subtitle"]' },
        points: {
          container: '.acf-field-repeater[data-name="we_follow_points"]',
          title: 'input[name*="point_title"]',
          subtitle: 'textarea[name*="point_subtitle"]'
        }
      },
      industrySpecific: {
        title: { label: 'AI and ML Section Tools Title:', selector: 'input[name*="industry_title"]' }
        // ... individual industries description fields
      },
      stepProcess: {
        title: { label: 'Step Process Section Title:', selector: 'input[name*="step_process_title"]' },
        description: { label: 'Step Process Section Description:', selector: 'textarea[name*="step_process_description"]' },
        steps: {
          container: '.acf-field-repeater[data-name="process_steps"]',
          title: 'input[name*="step_title"]',
          contentTitle: 'input[name*="content_title"]',
          contentDesc: 'textarea[name*="content_desc"]',
          checklist: 'textarea[name*="checklist"]'
        }
      },
      weCover: {
        title: { label: 'We cover section Title:', selector: 'input[name*="we_cover_title"]' },
        subtitle: { label: 'We cover section Subtitle:', selector: 'textarea[name*="we_cover_subtitle"]' },
        details: {
          container: '.acf-field-repeater[data-name="we_cover_details"]',
          title: 'input[name*="detail_title"]',
          subtitle: 'textarea[name*="detail_subtitle"]'
        }
      },
      technologies: {
        title: { label: 'Technologies We work section Title:', selector: 'input[name*="tech_title"]' },
        list: { label: 'Technologies We work section Technologies Title:', selector: 'textarea[name*="tech_list"]' }
      },
      faqs: {
        container: '.acf-field-repeater[data-name="faqs"]',
        question: 'input[name*="faq_question"]',
        answer: 'textarea[name*="faq_answer"]'
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
