const functions = require('firebase-functions')
const nodemailer = require('nodemailer')
const corsMiddleware = require('./utils/cors')

const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
})

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

exports.sendContactEmail = functions.https.onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      return res
        .status(405)
        .send({ success: false, error: 'Method Not Allowed' })
    }

    const { name, email, phone, subject, message } = req.body

    if (!email || !isValidEmail(email)) {
      return res.status(400).send({ success: false, error: 'Email inválido' })
    }

    const cleanSubject = (subject || 'Nuevo mensaje de contacto').replace(
      /[\r\n]/g,
      ' '
    )
    const cleanName = String(name || 'Anónimo').replace(/[\r\n]/g, ' ')
    const cleanPhone = String(phone || 'No proporcionado').replace(
      /[\r\n]/g,
      ' '
    )

    const safeName = escapeHtml(cleanName)
    const safeEmail = escapeHtml(email)
    const safePhoneHtml = escapeHtml(cleanPhone)
    const safeSubjectHtml = escapeHtml(cleanSubject)
    const safeMessageHtml = escapeHtml(String(message || '')).replace(
      /\n/g,
      '<br>'
    )

    const safeMessageText = String(message || '')
      .replace(/[\r\n]{2,}/g, '\n')
      .replace(/[^\x20-\x7E\n]/g, '')
      .slice(0, 2000)

    const mailOptions = {
      from: {
        name: 'Mensaje de la web',
        address: EMAIL_USER,
      },
      to: {
        name: 'Patronat Festes Roquetes',
        address: 'patronatfestesroquetes@gmail.com',
      },
      subject: cleanSubject,
      text: `
Nombre: ${safeName}
Email: ${safeEmail}
Teléfono: ${safePhoneHtml}
Asunto: ${safeSubjectHtml}
Mensaje:
${safeMessageText}
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
  <h2 style="color: #2c3e50;">📬 Nuevo mensaje de contacto</h2>
  <p><strong>Nombre:</strong> ${safeName}</p>
  <p><strong>Email:</strong> ${safeEmail}</p>
  <p><strong>Teléfono:</strong> ${safePhoneHtml}</p>
  <p><strong>Asunto:</strong> ${safeSubjectHtml}</p>
  <p><strong>Mensaje:</strong></p>
  <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
    <p style="white-space: pre-line; margin: 0;">${safeMessageHtml}</p>
  </div>
  <hr style="margin-top: 20px;">
  <p style="font-size: 12px; color: #888;">Este mensaje fue enviado desde el formulario de contacto del sitio web.</p>
</div>
      `,
    }

    try {
      await transporter.sendMail(mailOptions)
      return res.status(200).send({ success: true })
    } catch (error) {
      return res
        .status(500)
        .send({ success: false, error: 'Error interno al enviar correo' })
    }
  })
})

exports.sendBulkEmails = functions.https.onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      return res
        .status(405)
        .send({ success: false, error: 'Method Not Allowed' })
    }

    const { recipientType, recipients, subject, message } = req.body

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).send({
        success: false,
        error: 'Se requiere una lista válida de destinatarios',
      })
    }
    if (!subject || !message) {
      return res.status(400).send({
        success: false,
        error: 'Se requiere asunto y mensaje',
      })
    }

    const cleanSubject = String(subject).replace(/[\r\n]/g, ' ')

    const safeSubjectHtml = escapeHtml(cleanSubject)
    const safeMessageHtml = escapeHtml(String(message)).replace(/\n/g, '<br>')
    const safeMessageText = String(message)
      .replace(/[\r\n]{2,}/g, '\n')
      .replace(/[^\x20-\x7E\n]/g, '')
      .slice(0, 2000)

    const bccList = recipients
      .filter((r) => r.email && isValidEmail(r.email))
      .map((r) => {
        const cleanName = String(r.name || '').replace(/[\r\n]/g, ' ')
        return {
          name: escapeHtml(cleanName),
          address: r.email,
        }
      })

    if (bccList.length === 0) {
      return res.status(400).send({
        success: false,
        error: 'No hay destinatarios válidos en la lista',
      })
    }

    const recipientTitle =
      recipientType === 'partners' ? 'Socios' : 'Responsables de Peñas'

    const mailOptions = {
      from: {
        name: 'Patronat de Festes Roquetes',
        address: EMAIL_USER,
      },
      to: {
        name: 'Patronat',
        address: EMAIL_USER,
      },
      bcc: bccList,
      subject: cleanSubject,
      text: safeMessageText,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
  <h2 style="color: #2c3e50;">${safeSubjectHtml}</h2>
  <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
    <p style="white-space: pre-line; margin: 0;">${safeMessageHtml}</p>
  </div>
  <hr style="margin-top: 20px;">
  <p style="font-size: 12px; color: #888;">Este es un mensaje del Patronat de Festes de Roquetes para ${recipientTitle}.</p>
</div>
      `,
    }

    try {
      await transporter.sendMail(mailOptions)
      return res.status(200).send({
        success: true,
        message: `Correo enviado con éxito a ${bccList.length} destinatarios`,
      })
    } catch (error) {
      return res.status(500).send({
        success: false,
        error: 'Error interno al enviar correos masivos',
      })
    }
  })
})
