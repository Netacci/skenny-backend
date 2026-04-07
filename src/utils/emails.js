import { Resend } from 'resend';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

Handlebars.registerHelper('val', (value) => (value !== undefined && value !== null && value !== '') ? value : '-');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '../templates');

const templateCache = {};

function loadTemplate(templateName) {
  if (templateCache[templateName]) return templateCache[templateName];
  const filePath = path.join(TEMPLATES_DIR, `${templateName}.hbs`);
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = Handlebars.compile(source);
  templateCache[templateName] = compiled;
  return compiled;
}

/**
 * Send an email via Resend using a Handlebars template.
 *
 * @param {string} to - Recipient email address
 * @param {string} template - Template name (filename without .hbs)
 * @param {string} subject - Email subject
 * @param {Object} data - Template variables
 * @param {Object} [options] - Extra Resend options (e.g. replyTo)
 */
const sendEmail = async (to, template, subject, data, options = {}) => {
  try {
    const compile = loadTemplate(template);
    const html = compile({ ...data, year: new Date().getFullYear() });

    const payload = {
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
      ...options,
    };

    console.log(`[sendEmail] Sending "${template}" to ${to}`, payload);
    const { data: result, error } = await resend.emails.send(payload);

    if (error) {
      logger.error(`[sendEmail] Resend error for "${template}" to ${to}:`, error);
      console.error(`[sendEmail] Resend error:`, error);
    } else {
      console.log(`[sendEmail] Sent successfully, id: ${result.id}`);
    }
  } catch (e) {
    logger.error(`[sendEmail] Exception sending "${template}" to ${to}: ${e.message}`);
    console.error(`[sendEmail] Exception:`, e.message);
  }
};

export { sendEmail };
