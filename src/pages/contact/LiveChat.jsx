import React, { useState, useEffect, useRef, useContext } from 'react'
import { db } from '../../firebase/firebase'
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { AuthContext } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import DynamicButton from '../../components/Buttons'
import DynamicInput from '../../components/Inputs'

const LiveChat = () => {
  const { user, userData, loading: authLoading } = useContext(AuthContext)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [chatId, setChatId] = useState(null)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const viewDictionary = 'pages.contact.liveChat'
  const userId = user ? user.uid : null
  const userInfo = user
    ? {
        id: user.uid,
        name: user.displayName || user.email,
        email: user.email,
        role: userData?.role || 'user',
      }
    : null

  useEffect(() => {
    if (
      isOpen &&
      !chatId &&
      !authLoading &&
      user &&
      userData?.role !== 'admin'
    ) {
      const generateChatId = async () => {
        const userChatsQuery = query(
          collection(db, 'chats'),
          where('userId', '==', userId),
          where('isActive', '==', true)
        )

        const unsubscribe = onSnapshot(userChatsQuery, (snapshot) => {
          unsubscribe()
          if (snapshot.empty) {
            createNewChat()
          } else {
            setChatId(snapshot.docs[0].id)
          }
        })
      }

      generateChatId()
    }
  }, [isOpen, chatId, userId, authLoading, userData?.role])

  const createNewChat = async () => {
    if (userData?.role === 'admin') return

    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        userId,
        userInfo,
        createdAt: serverTimestamp(),
        isActive: true,
      })
      setChatId(chatRef.id)

      await addDoc(collection(db, `chats/${chatRef.id}/messages`), {
        text: t(`${viewDictionary}.welcomeMessage`, { name: userInfo.name }),
        sender: 'support',
        createdAt: serverTimestamp(),
        isRead: false,
      })
    } catch (error) {
      // Error al crear chat
    }
  }

  useEffect(() => {
    if (!isOpen || !chatId) return
    setLoading(true)
    const messagesQuery = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = []
      snapshot.forEach((doc) => {
        messagesList.push({ id: doc.id, ...doc.data() })
      })
      setMessages(messagesList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [chatId, isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !chatId) return

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        text: newMessage.trim(),
        sender: 'user',
        userId,
        userInfo,
        createdAt: serverTimestamp(),
        isRead: false,
      })
      setNewMessage('')
    } catch (error) {
      // Error al enviar mensaje
    }
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return ''
    }
    return timestamp.toDate().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.sender === 'support' && !lastMessage.isRead) {
        const chatButton = document.querySelector('.chat-toggle-button')
        if (chatButton) {
          chatButton.classList.add('animate-pulse')
        }
      }
    } else {
      const markMessagesAsRead = async () => {
        if (!chatId) return

        const unreadMessages = messages.filter(
          (message) => message.sender === 'support' && !message.isRead
        )

        for (const message of unreadMessages) {
          try {
            const messageRef = doc(db, `chats/${chatId}/messages`, message.id)
            await updateDoc(messageRef, { isRead: true })
          } catch (error) {
            // Error al marcar mensaje como leído
          }
        }
      }

      markMessagesAsRead()
    }
  }, [isOpen, messages, chatId])

  const navigateToRegister = () => {
    window.location.href = '/register'
  }

  const navigateToLogin = () => {
    window.location.href = '/login'
  }

  const handleChangeMessage = (e) => {
    setNewMessage(e.target.value)
  }

  if (userData?.role === 'admin') {
    return null
  }

  return (
    <div className="fixed bottom-[15px] md:bottom-[20px] right-[15px] md:right-[20px] z-[1000] font-sans">
      {!user && isOpen ? (
        <div className="w-[90vw] max-w-[320px] sm:w-[350px] bg-white bg-opacity-75 backdrop-blur-lg backdrop-saturate-[180%] rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
          <div className="text-black p-[10px] flex justify-between items-center">
            <h3 className="m-0 t16b">{t(`${viewDictionary}.title`)}</h3>
            <button
              className="text-2xl leading-none text-black bg-transparent border-none cursor-pointer hover:text-gray-200 focus:outline-none"
              onClick={toggleChat}
              aria-label="Cerrar chat"
            >
              ×
            </button>
          </div>
          <div className="p-[15px] md:p-[20px] flex flex-col items-center text-center">
            <h2 className="mb-3 text-lg font-bold text-gray-800 md:text-xl">
              {t(`${viewDictionary}.authRequired.title`)}
            </h2>

            <div className="mb-4 text-sm md:text-base">
              <p className="mb-2">{t(`${viewDictionary}.authRequired.text`)}</p>
            </div>

            <div className="flex flex-col justify-center w-full space-y-3 sm:w-auto sm:flex-row sm:space-y-0 sm:space-x-3">
              <DynamicButton
                size="small"
                state="normal"
                type="personAdd"
                onClick={navigateToRegister}
                textId={t('common.register')}
              />

              <DynamicButton
                size="small"
                state="highlighted"
                onClick={navigateToLogin}
                textId={t('common.login')}
              />
            </div>
          </div>
        </div>
      ) : isOpen ? (
        <div className="w-[95vw] max-w-[350px] h-[70vh] max-h-[450px] bg-white rounded-lg shadow-lg flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
          <div className="bg-[#8BE484] text-white p-[10px] flex justify-between items-center">
            <h3 className="m-0 truncate t16b">
              {t(`${viewDictionary}.title`)}
            </h3>
            <DynamicButton
              size="x-small"
              state="normal"
              type="cancel"
              onClick={toggleChat}
              aria-label="Cerrar chat"
            />
          </div>

          <div className="flex-1 p-[10px] overflow-y-auto bg-gray-50">
            {authLoading || loading ? (
              <div className="flex items-center justify-center h-full text-gray-500 t14r">
                {t(`${viewDictionary}.loading`)}
              </div>
            ) : (
              <div className="space-y-[10px]">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] clear-both ${
                      message.sender === 'user'
                        ? 'float-right bg-blue-100 rounded-tl-lg rounded-tr-lg rounded-bl-lg ml-auto'
                        : 'float-left bg-gray-200 rounded-tr-lg rounded-tl-lg rounded-br-lg mr-auto'
                    } p-[8px] md:p-[10px] relative`}
                  >
                    <div className="text-sm break-words md:t14r">
                      {message.text}
                    </div>
                    <div className="text-[8px] md:t10r text-gray-500 text-right mt-[3px]">
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-[1px]" />
              </div>
            )}
          </div>

          <form
            className="p-[8px] md:p-[10px] border-t border-gray-200 bg-white flex gap-[8px] md:gap-[10px] items-center"
            onSubmit={handleSubmit}
          >
            <div className="flex-1">
              <DynamicInput
                type="text"
                name="message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t(`${viewDictionary}.inputPlaceholder`)}
                disabled={authLoading || loading}
              />
            </div>
            <DynamicButton
              size="x-small"
              state={authLoading || loading ? 'disabled' : 'normal'}
              type="submit"
              onClick={handleSubmit}
              disabled={authLoading || loading}
            />
          </form>
        </div>
      ) : (
        <DynamicButton
          size="x-small"
          state={authLoading ? 'disabled' : 'normal'}
          onClick={toggleChat}
          disabled={authLoading}
          aria-label={t(`${viewDictionary}.title`)}
        >
          💬
        </DynamicButton>
      )}
    </div>
  )
}

export default LiveChat
