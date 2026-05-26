import nodemailer from 'nodemailer';import env from '../config/env.js';
export async function sendMail({to,subject,html}){if(!env.smtp.user||!env.smtp.pass){console.log('[MAIL STUB]',{to,subject});return {stub:true}} const tr=nodemailer.createTransport(env.smtp);return tr.sendMail({from:`${env.smtp.fromName} <${env.smtp.fromEmail}>`,to,subject,html});}
