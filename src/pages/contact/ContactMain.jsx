import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'
import { getCsrfToken } from '../../utils/security'

const ContactMain = () => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    website: '',
  })
  const [formStatus, setFormStatus] = useState(null)
  const [lastSubmission, setLastSubmission] = useState(0)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [csrfToken, setCsrfToken] = useState('')
  const recaptchaRef = useRef(null)
  const viewDictionary = 'pages.contact.form'

  const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
  const DISABLE_RECAPTCHA = true

  useEffect(() => {
    const fetchCsrfToken = async () => {
      const token = await getCsrfToken()
      setCsrfToken(token)
    }

    fetchCsrfToken()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.website) {
      setFormStatus({
        type: 'success',
        message: t(`${viewDictionary}.success`),
      })
      return
    }

    const now = Date.now()
    if (submissionCount >= 3 && now - lastSubmission < 300000) {
      setFormStatus({
        type: 'error',
        message: t(`${viewDictionary}.tooManyRequests`),
      })
      return
    }

    if (!formData.name || !formData.email || !formData.message) {
      setFormStatus({
        type: 'error',
        message: t(`${viewDictionary}.validation.requiredFields`),
      })
      return
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(formData.email)) {
      setFormStatus({
        type: 'error',
        message: t(`${viewDictionary}.validation.invalidEmail`),
      })
      return
    }

    if (formData.name.length > 100 || formData.message.length > 5000) {
      setFormStatus({
        type: 'error',
        message: t(`${viewDictionary}.validation.fieldTooLong`),
      })
      return
    }

    if (!captchaToken && !IS_DEVELOPMENT && !DISABLE_RECAPTCHA) {
      setFormStatus({
        type: 'error',
        message: t(`${viewDictionary}.validation.captchaRequired`),
      })
      return
    }

    setFormStatus({
      type: 'loading',
      message: t(`${viewDictionary}.sending`),
    })

    const jsonData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      subject: formData.subject,
      message: formData.message,
      recaptchaToken:
        captchaToken || (IS_DEVELOPMENT ? 'dev-token-not-validated' : null),
    }

    try {
      const response = await fetch(process.env.REACT_APP_CONTACT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(jsonData),
      })

      if (!response.ok) throw new Error('Error en el envío del correo')

      setFormStatus({
        type: 'success',
        message: t(`${viewDictionary}.successMessage`),
      })

      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        website: '',
      })

      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
      }
      setCaptchaToken(null)
      setSubmissionCount((prev) => prev + 1)
      setLastSubmission(now)
      setTimeout(() => setFormStatus(null), 5000)
    } catch (error) {
      setFormStatus({
        type: 'error',
        message: t(`${viewDictionary}.errorMessage`),
      })
    }
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <h1 className="mb-10 text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`)}
      </h1>

      <p className="mb-8 text-center">{t(`${viewDictionary}.description`)}</p>

      <div className="flex flex-col items-center gap-10">
        <div className="p-6 bg-white bg-opacity-75 shadow-lg backdrop-blur-lg rounded-3xl w-[80%]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center space-y-4"
          >
            <DynamicInput
              type="text"
              name="name"
              textId={`${viewDictionary}.name`}
              value={formData.name}
              onChange={handleChange}
              required
            />

            <DynamicInput
              type="email"
              name="email"
              textId={`${viewDictionary}.email`}
              value={formData.email}
              onChange={handleChange}
              required
            />

            <DynamicInput
              type="phone"
              name="phone"
              textId={`${viewDictionary}.phone`}
              value={formData.phone}
              onChange={handleChange}
            />

            <DynamicInput
              type="text"
              name="subject"
              textId={`${viewDictionary}.subject`}
              value={formData.subject}
              onChange={handleChange}
            />

            <DynamicInput
              type="textarea"
              name="message"
              textId={`${viewDictionary}.message`}
              value={formData.message}
              onChange={handleChange}
              rows={5}
              required
            />

            <div style={{ display: 'none' }}>
              <DynamicInput
                type="text"
                name="website"
                textId="Website"
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col items-center justify-center w-full">
              {formStatus && formStatus.type !== 'loading' && (
                <div
                  className={`text-sm mb-3 ${
                    formStatus.type === 'error'
                      ? 'text-red-500'
                      : formStatus.type === 'success'
                        ? 'text-green-600'
                        : 'text-blue-500'
                  }`}
                >
                  {formStatus.message}
                </div>
              )}

              <DynamicButton
                type="submit"
                size="medium"
                state={formStatus?.type === 'loading' ? 'disabled' : 'normal'}
                textId={`${viewDictionary}.submitButton`}
                disabled={formStatus?.type === 'loading'}
              />
            </div>
          </form>
        </div>
      </div>

      <Loader
        loading={formStatus?.type === 'loading'}
        size="40px"
        color="#3A3A3A"
        text={formStatus?.message}
      />
    </div>
  )
}

export default ContactMain
