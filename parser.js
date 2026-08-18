import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

/**
 * Extracts raw text from a file (.docx, .txt, or .md)
 * @param {string} filePath 
 * @returns {Promise<string>}
 */
export async function getRawText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.docx') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Word file not found at: ${filePath}`);
    }
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (ext === '.txt' || ext === '.md') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Text file not found at: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  } else {
    throw new Error(`Unsupported file extension: ${ext}. Use .docx, .txt, or .md`);
  }
}

/**
 * Parses the raw content text into a structured JSON object.
 * @param {string} text 
 * @returns {object}
 */
export function parseContent(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim());
  const data = {
    banner: {},
    buildMvp: { challenges: [] },
    serviceInclude: { services: [] },
    weFollow: { points: [] },
    industrySpecific: { industries: [] },
    stepProcess: { steps: [] },
    weCover: { details: [] },
    technologies: { list: [] },
    faqs: []
  };

  let currentSection = null;
  let tempServiceTitle = null;
  let tempPointTitle = null;
  let tempIndustryTitle = null;
  let tempDetailTitle = null;
  
  // For process steps
  let currentStep = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Detect section separators or headers
    if (line.includes('****')) {
      continue;
    }

    // 1. Banner Section
    if (line.startsWith('Banner Section Title:')) {
      data.banner.title = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('Banner Section Sub Title:')) {
      // Sometimes followed by another paragraph or title line, let's grab next lines until empty or another field
      let val = lines[++i]?.trim() || '';
      // Read multi-line if needed
      while (i + 1 < lines.length && !lines[i+1].includes(':') && lines[i+1].trim() !== '' && !lines[i+1].startsWith('*')) {
        val += '\n' + lines[++i].trim();
      }
      data.banner.subtitle = val;
      continue;
    }
    if (line.startsWith('Banner Section Banner Bottom Right Title:')) {
      let val = lines[++i]?.trim() || '';
      while (i + 1 < lines.length && !lines[i+1].includes(':') && lines[i+1].trim() !== '' && !lines[i+1].startsWith('*')) {
        val += ' ' + lines[++i].trim();
      }
      data.banner.bottomRightTitle = val;
      continue;
    }

    // 2. Build MVP Section
    if (line.startsWith('Build MVP Section Left Title:')) {
      data.buildMvp.leftTitle = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('Build MVP Section Left Subtitle:')) {
      let val = lines[++i]?.trim() || '';
      while (i + 1 < lines.length && !lines[i+1].includes(':') && lines[i+1].trim() !== '' && !lines[i+1].startsWith('*')) {
        val += ' ' + lines[++i].trim();
      }
      data.buildMvp.leftSubtitle = val;
      continue;
    }
    if (line.startsWith('Build MVP Section Right Title:')) {
      data.buildMvp.rightTitle = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('Build MVP Section Right Subtitle:')) {
      // This is a list of challenges starting with *
      let val = '';
      if (lines[i+1]?.trim().startsWith('*')) {
        while (i + 1 < lines.length && lines[i+1].trim().startsWith('*')) {
          const item = lines[++i].trim().substring(1).trim();
          data.buildMvp.challenges.push(item);
        }
      } else {
        val = lines[++i]?.trim() || '';
        while (i + 1 < lines.length && !lines[i+1].includes(':') && lines[i+1].trim() !== '') {
          val += ' ' + lines[++i].trim();
        }
        data.buildMvp.rightSubtitle = val;
      }
      continue;
    }
    // Fallback challenges capture
    if (line.startsWith('*') && data.buildMvp.challenges.length === 0 && !data.serviceInclude.title) {
      data.buildMvp.challenges.push(line.substring(1).trim());
      continue;
    }

    // 3. Service Include Section
    if (line.startsWith('Service Include Section Title:')) {
      data.serviceInclude.title = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('Service Include Section Subtitle:')) {
      let val = lines[++i]?.trim() || '';
      while (i + 1 < lines.length && !lines[i+1].includes(':') && lines[i+1].trim() !== '' && !lines[i+1].startsWith('*')) {
        val += ' ' + lines[++i].trim();
      }
      data.serviceInclude.subtitle = val;
      continue;
    }
    if (line.startsWith('Service Include Section Service Title:')) {
      tempServiceTitle = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('Service Include Section Service Subtitle:')) {
      const content = lines[++i]?.trim() || '';
      
      // Quirky behavior handling:
      // If we have no tempServiceTitle, or we just finished a service and got another Subtitle label,
      // it means this Subtitle is actually a Service Title, and the next one will be the subtitle.
      if (tempServiceTitle === null) {
        tempServiceTitle = content;
      } else {
        data.serviceInclude.services.push({
          title: tempServiceTitle,
          subtitle: content
        });
        tempServiceTitle = null; // reset
      }
      continue;
    }

    // 4. We Follow Section
    if (line.startsWith('We follow section Title:')) {
      data.weFollow.title = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('We follow section Subtitle:')) {
      let val = lines[++i]?.trim() || '';
      while (i + 1 < lines.length && !lines[i+1].includes(':') && lines[i+1].trim() !== '' && !lines[i+1].startsWith('*')) {
        val += ' ' + lines[++i].trim();
      }
      data.weFollow.subtitle = val;
      continue;
    }
    if (line.startsWith('We follow section Points Title:')) {
      tempPointTitle = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('We follow section Points Subtitle:')) {
      const content = lines[++i]?.trim() || '';
      data.weFollow.points.push({
        title: tempPointTitle || '',
        subtitle: content
      });
      tempPointTitle = null;
      continue;
    }

    // 5. AI and ML Section (Industries)
    if (line.startsWith('AI and ML Section Tools Title:')) {
      data.industrySpecific.title = lines[++i]?.trim() || '';
      // The next item is SaaS (which lacks a label). Let's parse the industries manually in sequence
      // since the labels are irregular.
      continue;
    }
    if (line === 'SaaS') {
      const desc = lines[++i]?.trim() || '';
      data.industrySpecific.industries.push({ title: 'SaaS', subtitle: desc });
      continue;
    }
    if (line.startsWith('AI and ML Section Tools Technology Title:')) {
      tempIndustryTitle = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('AI and ML Section Tools Technology Subtitle:')) {
      const desc = lines[++i]?.trim() || '';
      data.industrySpecific.industries.push({
        title: tempIndustryTitle || '',
        subtitle: desc
      });
      tempIndustryTitle = null;
      continue;
    }
    if (line === 'AI Products') {
      const desc = lines[++i]?.trim() || '';
      data.industrySpecific.industries.push({ title: 'AI Products', subtitle: desc });
      continue;
    }

    // 6. Step Process Section
    if (line.startsWith('Step Process Section Title:')) {
      data.stepProcess.title = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('Step Process Section Description:')) {
      let val = lines[++i]?.trim() || '';
      while (i + 1 < lines.length && !lines[i+1].includes(':') && lines[i+1].trim() !== '' && !lines[i+1].startsWith('*')) {
        val += ' ' + lines[++i].trim();
      }
      data.stepProcess.description = val;
      continue;
    }
    if (line.startsWith('Step Process Section Process Step Title:')) {
      if (currentStep) {
        data.stepProcess.steps.push(currentStep);
      }
      currentStep = {
        stepNumber: lines[++i]?.trim() || '',
        checklist: []
      };
      continue;
    }
    if (line.startsWith('Step Process Section Process Step Content title:')) {
      if (currentStep) {
        currentStep.title = lines[++i]?.trim() || '';
      }
      continue;
    }
    if (line.startsWith('Step Process Section Process Step Content Description:')) {
      if (currentStep) {
        currentStep.description = lines[++i]?.trim() || '';
      }
      continue;
    }
    if (line.startsWith('Step Process Section Process Step Checklist:')) {
      // Read the checklist title (like "Benefits")
      if (currentStep) {
        currentStep.checklistTitle = lines[++i]?.trim() || '';
        // Collect following bullet points
        while (i + 1 < lines.length && lines[i+1].trim().startsWith('*')) {
          currentStep.checklist.push(lines[++i].trim().substring(1).trim());
        }
      }
      continue;
    }

    // 7. We Cover Section
    if (line.startsWith('We cover section Title:')) {
      data.weCover.title = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('We cover section Subtitle:')) {
      let val = lines[++i]?.trim() || '';
      while (i + 1 < lines.length && !lines[i+1].includes(':') && lines[i+1].trim() !== '' && !lines[i+1].startsWith('*')) {
        val += ' ' + lines[++i].trim();
      }
      data.weCover.subtitle = val;
      continue;
    }
    if (line.startsWith('We cover section Detail Title:')) {
      tempDetailTitle = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('We cover section Detail Subtitle:')) {
      const content = lines[++i]?.trim() || '';
      data.weCover.details.push({
        title: tempDetailTitle || '',
        subtitle: content
      });
      tempDetailTitle = null;
      continue;
    }

    // 8. Technologies Section
    if (line.startsWith('Technologies We work section Title:')) {
      data.technologies.title = lines[++i]?.trim() || '';
      continue;
    }
    if (line.startsWith('Technologies We work section Technologies Title:')) {
      // First item
      let firstItem = lines[++i]?.trim() || '';
      if (firstItem.startsWith('*')) {
        data.technologies.list.push(firstItem.substring(1).trim());
      } else {
        data.technologies.list.push(firstItem);
      }
      // Followed by more items
      while (i + 1 < lines.length && lines[i+1].trim().startsWith('*') && !lines[i+1].includes(':')) {
        data.technologies.list.push(lines[++i].trim().substring(1).trim());
      }
      continue;
    }
    if (line.startsWith('*') && data.technologies.title && data.technologies.list.length > 0 && !data.faqs.length) {
      data.technologies.list.push(line.substring(1).trim());
      continue;
    }

    // 9. FAQs Section
    if (line.startsWith('FAQs')) {
      continue;
    }
    // Match question like "1. What do..."
    const faqMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (faqMatch) {
      const q = faqMatch[2].trim();
      const a = lines[++i]?.trim() || '';
      data.faqs.push({ question: q, answer: a });
      continue;
    }
  }

  // Push last step if exists
  if (currentStep) {
    data.stepProcess.steps.push(currentStep);
  }

  return data;
}

/**
 * Main parser function to load and parse content file
 * @param {string} filePath 
 * @returns {Promise<object>}
 */
export async function parseFile(filePath) {
  const rawText = await getRawText(filePath);
  return parseContent(rawText);
}
