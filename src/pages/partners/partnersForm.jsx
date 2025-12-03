import React, { useState, useContext } from 'react'
import log from 'loglevel'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import { showPopup } from '../../services/popupService'
import { useTranslation, Trans } from 'react-i18next'
import DynamicButton from '../../components/Buttons'

function PartnersForm() {
  const { t } = useTranslation()
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const viewDictionary = 'pages.partners.registerPartners'

  const [formState, setFormState] = useState({
    name: '',
    lastName: '',
    address: '',
    email: '',
    phone: '',
    birthDate: '',
    accountNumber: '',
    dni: '',
    submitting: false,
  })

  log.setLevel('info')

  const resetForm = () => {
    setFormState({
      name: '',
      lastName: '',
      address: '',
      email: '',
      phone: '',
      birthDate: '',
      accountNumber: '',
      dni: '',
      submitting: false,
    })
  }

  const validateForm = () => {
    if (
      !formState.name ||
      !formState.lastName ||
      !formState.email ||
      !formState.dni
    ) {
      return t(`${viewDictionary}.validation.requiredFields`)
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(formState.email)) {
      return t(`${viewDictionary}.validation.invalidEmail`)
    }
    const dniRx = /^[0-9]{8}[A-Za-z]$/
    if (!dniRx.test(formState.dni)) {
      return t(`${viewDictionary}.validation.invalidDni`)
    }

    if (formState.birthDate) {
      const d = new Date(formState.birthDate)
      if (isNaN(d.getTime())) {
        return t(`${viewDictionary}.validation.invalidDate`)
      }
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormState((s) => ({ ...s, submitting: true }))

    const err = validateForm()
    if (err) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: err,
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
      setFormState((s) => ({ ...s, submitting: false }))
      return
    }
    if (!user) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.authError`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
      setFormState((s) => ({ ...s, submitting: false }))
      return
    }

    try {
      const partnersRef = collection(db, 'partners')
      const partnerData = {
        name: formState.name,
        lastName: formState.lastName,
        address: formState.address || '',
        email: formState.email,
        phone: formState.phone || '',
        birthDate: formState.birthDate || '',
        dni: formState.dni,
        accountNumber: '',
        status: 'pending',
        createdAt: new Date(),
        createdBy: user.uid,
      }

      await addDoc(partnersRef, partnerData)
      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#8be484',
      })

      navigate('/dashboard')
      resetForm()
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text`),
        icon: 'error',
        confirmButtonText: t('components.buttons.confirm'),
        confirmButtonColor: '#a3a3a3',
      })
    } finally {
      setFormState((s) => ({ ...s, submitting: false }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormState((s) => ({ ...s, [name]: value }))
  }

  return (
    <div className="pb-[4vh] bg-transparent min-h-dvh w-full">
      <section className="w-[92%] mx-auto md:w-auto md:max-w-[90%] flex flex-col items-center sm:flex-none">
        <h2 className="mb-[4vh] text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`)}
        </h2>
        <p className="text-center t16r w-[90%] max-w-[90vw] sm:max-w-none flex flex-col items-center sm:flex-none">
          <Trans
            i18nKey={`${viewDictionary}.descriptionLabel`}
            components={{ strong: <strong />, br: <br /> }}
          />
        </p>

        <Loader loading={formState.submitting} />

        <form onSubmit={handleSubmit} className="p-[4%] space-y-[3vh] w-full">
          <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-2 md:gap-[2vw] justify-items-center w-full">
            <DynamicInput
              name="name"
              textId={`${viewDictionary}.nameLabel`}
              placeholder={t(`${viewDictionary}.namePlaceholder`)}
              type="text"
              value={formState.name}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="lastName"
              textId={`${viewDictionary}.lastNameLabel`}
              placeholder={t(`${viewDictionary}.lastNamePlaceholder`)}
              type="text"
              value={formState.lastName}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="address"
              textId={`${viewDictionary}.addressLabel`}
              placeholder={t(`${viewDictionary}.addressPlaceholder`)}
              type="text"
              value={formState.address}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="email"
              textId={`${viewDictionary}.emailLabel`}
              placeholder={t(`${viewDictionary}.emailPlaceholder`)}
              type="email"
              value={formState.email}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="phone"
              textId={`${viewDictionary}.phoneLabel`}
              placeholder={t(`${viewDictionary}.phonePlaceholder`)}
              type="phone"
              value={formState.phone}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="birthDate"
              textId={`${viewDictionary}.birthDateLabel`}
              type="date"
              value={formState.birthDate}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="dni"
              textId={`${viewDictionary}.dniLabel`}
              placeholder={t(`${viewDictionary}.dniPlaceholder`)}
              type="text"
              value={formState.dni}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
          </div>
          <div className="flex justify-center pt-[3vh]">
            <DynamicButton
              type="submit"
              size="medium"
              state={formState.submitting ? 'disabled' : 'normal'}
              textId={
                formState.submitting
                  ? `${viewDictionary}.submittingText`
                  : `${viewDictionary}.submitButton`
              }
              disabled={formState.submitting}
            />
          </div>
        </form>
      </section>
    </div>
  )
}

export default PartnersForm
