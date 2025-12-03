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
  writeBatch,
  getDocs,
} from 'firebase/firestore'
import { AuthContext } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import DynamicButton from '../../components/Buttons'
import DynamicInput from '../../components/Inputs'

const AdminChatPanel = () => {
  const { t } = useTranslation()
  const { user, userData, loading: authLoading } = useContext(AuthContext)
  const [activeChats, setActiveChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [unreadCounts, setUnreadCounts] = useState({})
  const viewDictionary = 'pages.contact.adminChatPanel'

  useEffect(() => {
    if (!authLoading) {
      if (userData?.role !== 'admin') {
        // Acceso denegado: Necesitas ser administrador para acceder a este panel
      }
    }
  }, [userData, authLoading, user])

  useEffect(() => {
    if (authLoading || userData?.role !== 'admin') return

    setLoading(true)

    try {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('isActive', '==', true)
      )

      const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
        const chatsList = []
        snapshot.forEach((doc) => {
          chatsList.push({ id: doc.id, ...doc.data() })
          fetchUnreadCount(doc.id)
        })

        setActiveChats(chatsList)
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (error) {
      setLoading(false)
    }
  }, [authLoading, userData, user])

  const fetchUnreadCount = async (chatId) => {
    try {
      const unreadQuery = query(
        collection(db, `chats/${chatId}/messages`),
        where('sender', '==', 'user'),
        where('isRead', '==', false)
      )

      const snapshot = await getDocs(unreadQuery)
      setUnreadCounts((prev) => ({
        ...prev,
        [chatId]: snapshot.size,
      }))
    } catch (error) {
      // Error al contar mensajes no leídos para chat
    }
  }

  useEffect(() => {
    if (!selectedChat) return

    setLoading(true)
    const messagesQuery = query(
      collection(db, `chats/${selectedChat.id}/messages`),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = []
      snapshot.forEach((doc) => {
        messagesList.push({ id: doc.id, ...doc.data() })
      })
      setMessages(messagesList)
      setLoading(false)
      markUserMessagesAsRead(selectedChat.id, messagesList)
    })

    return () => unsubscribe()
  }, [selectedChat])

  const markUserMessagesAsRead = async (chatId, messagesList) => {
    try {
      const batch = writeBatch(db)
      let hasUnreadMessages = false

      messagesList.forEach((message) => {
        if (message.sender === 'user' && !message.isRead) {
          const messageRef = doc(db, `chats/${chatId}/messages/${message.id}`)
          batch.update(messageRef, { isRead: true })
          hasUnreadMessages = true
        }
      })

      if (hasUnreadMessages) {
        await batch.commit()
        setUnreadCounts((prev) => ({
          ...prev,
          [chatId]: 0,
        }))
      }
    } catch (error) {
      // Error al marcar mensajes como leídos
    }
  }

  useEffect(() => {
    const shouldAutoScroll = () => {
      if (!messagesEndRef.current) return false
      const container = messagesEndRef.current.parentElement
      if (!container) return false
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      return (
        distanceFromBottom < 200 ||
        (messages.length > 0 &&
          messages[messages.length - 1]?.sender === 'support')
      )
    }

    if (shouldAutoScroll()) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        })
      }, 100)
    }
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat) return

    try {
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        text: newMessage.trim(),
        sender: 'support',
        createdAt: serverTimestamp(),
        isRead: false,
      })

      setNewMessage('')
    } catch (error) {
      // Error al enviar mensaje
    }
  }

  const closeChat = async (chatId) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        isActive: false,
      })

      if (selectedChat && selectedChat.id === chatId) {
        setSelectedChat(null)
      }
    } catch (error) {
      // Error al cerrar chat
    }
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

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return ''
    }
    return timestamp.toDate().toLocaleDateString()
  }

  if (authLoading) {
    return <div className="p-4">{t(`${viewDictionary}.loading.page`)}</div>
  }

  if (userData?.role !== 'admin') {
    return (
      <div className="p-4 text-red-500">
        {t(`${viewDictionary}.accessDenied`)}
      </div>
    )
  }

  return (
    <div className="h-auto w-[96%] sm:w-[92%] mx-auto pb-[4vh] sm:pb-[6vh]">
      <h1 className="mb-4 sm:mb-[5vh] overflow-hidden text-center t24b sm:t40b md:t64b whitespace-break-spaces">
        {t(`${viewDictionary}.title`)}
      </h1>

      <div
        className={`grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-[1.5rem] ${selectedChat ? 'md:grid-rows-[auto]' : ''}`}
      >
        <div
          className={`md:col-span-2 w-full max-w-full ${selectedChat ? 'hidden md:block' : 'block'}`}
        >
          <div className="space-y-2 sm:space-y-[1rem] bg-[#D9D9D9] rounded-[1rem] sm:rounded-[2rem] md:rounded-[3rem] h-fit w-full mb-3 sm:mb-[1.5rem] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <div className="flex items-center justify-between">
              <h3 className="pt-3 sm:pt-[1rem] pl-4 sm:pl-[1.5rem] md:pl-[2rem] t24b">
                {t(`${viewDictionary}.activeChats`, {
                  count: activeChats.length,
                })}
              </h3>
              {selectedChat && (
                <div className="mt-3 mr-4 md:hidden">
                  <DynamicButton
                    size="x-small"
                    state="normal"
                    type="view"
                    onClick={() => setSelectedChat(null)}
                    textId={`${viewDictionary}.backButton`}
                  />
                </div>
              )}
            </div>
            <div className="px-3 sm:px-[0.5rem] pb-3 sm:pb-[1rem] h-[50vh] md:h-[calc(70vh-200px)] overflow-y-auto">
              {loading && activeChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 t16r sm:t18r">
                  {t(`${viewDictionary}.loading.chats`)}
                </div>
              ) : activeChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 t16r sm:t18r">
                  {t(`${viewDictionary}.noChats`)}
                </div>
              ) : (
                <ul className="space-y-[0.5rem]">
                  {activeChats.map((chat) => (
                    <li
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-100 transition-colors duration-200 rounded-[0.8rem] sm:rounded-[1rem] ${
                        selectedChat?.id === chat.id
                          ? 'bg-blue-50 shadow-md'
                          : 'bg-white bg-opacity-50'
                      } relative`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center t18b sm:t20b truncate max-w-[70%]">
                          {chat.userInfo?.name ||
                            t(`${viewDictionary}.userPlaceholders.name`)}
                          {unreadCounts[chat.id] > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 ml-2 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                              {unreadCounts[chat.id]}
                            </span>
                          )}
                        </div>
                        <div className="ml-1 text-xs text-gray-500 sm:text-sm whitespace-nowrap">
                          {formatDate(chat.createdAt)}
                        </div>
                      </div>
                      <div className="mt-1 text-gray-600 truncate t12r sm:t14r">
                        {chat.userInfo?.email ||
                          t(`${viewDictionary}.userPlaceholders.email`)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div
          className={`md:col-span-3 w-full max-w-full ${selectedChat ? 'block' : 'hidden md:block'}`}
        >
          <div className="bg-[#D9D9D9] rounded-[1rem] sm:rounded-[2rem] md:rounded-[3rem] h-full w-full mb-3 sm:mb-[1.5rem] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] flex flex-col">
            {selectedChat ? (
              <>
                <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-white bg-opacity-30 rounded-t-[1rem] sm:rounded-t-[2rem] md:rounded-t-[3rem]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="mr-2 md:hidden">
                        <DynamicButton
                          size="x-small"
                          state="normal"
                          onClick={() => setSelectedChat(null)}
                        >
                          ←
                        </DynamicButton>
                      </div>
                      <div className="truncate">
                        <h2 className="truncate t20b sm:t24b">
                          {selectedChat.userInfo?.name ||
                            t(`${viewDictionary}.userPlaceholders.name`)}
                        </h2>
                        <div className="text-gray-600 truncate t14r sm:t16r">
                          {selectedChat.userInfo?.email ||
                            t(`${viewDictionary}.userPlaceholders.email`)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <DynamicButton
                    size="x-small"
                    state="normal"
                    type="delete"
                    onClick={() => closeChat(selectedChat.id)}
                  />
                </div>
                <div className="flex-grow p-3 sm:p-4 overflow-y-auto bg-white bg-opacity-30 h-[40vh] sm:h-[50vh] md:h-[calc(70vh-280px)]">
                  {loading ? (
                    <div className="text-center text-gray-500 t16r sm:t18r">
                      {t(`${viewDictionary}.loading.messages`)}
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-[85%] sm:max-w-[80%] clear-both ${
                            message.sender === 'support'
                              ? 'float-right bg-[#8be484] rounded-tl-[0.75rem] sm:rounded-tl-[1rem] rounded-tr-[0.75rem] sm:rounded-tr-[1rem] rounded-bl-[0.75rem] sm:rounded-bl-[1rem] ml-auto'
                              : 'float-left bg-gray-100 rounded-tr-[0.75rem] sm:rounded-tr-[1rem] rounded-tl-[0.75rem] sm:rounded-tl-[1rem] rounded-br-[0.75rem] sm:rounded-br-[1rem] mr-auto'
                          } p-2.5 sm:p-3 relative shadow-sm`}
                        >
                          <div className="break-words t16r sm:t18r">
                            {message.text}
                          </div>
                          <div className="flex items-center justify-end mt-1 space-x-1 text-[10px] sm:text-xs text-gray-500">
                            <span>{formatTime(message.createdAt)}</span>
                            {message.sender === 'support' && (
                              <span
                                className="ml-1"
                                title={
                                  message.isRead
                                    ? t(`${viewDictionary}.status.read`)
                                    : t(`${viewDictionary}.status.sent`)
                                }
                              >
                                {message.isRead ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-blue-500 sm:w-4 sm:h-4"
                                    aria-label={t(
                                      `${viewDictionary}.status.read`
                                    )}
                                  >
                                    <path d="M18 6L7 17L2 12" />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-gray-400 sm:w-4 sm:h-4"
                                    aria-label={t(
                                      `${viewDictionary}.status.sent`
                                    )}
                                  >
                                    <path d="M5 12h14" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div
                        ref={messagesEndRef}
                        className="h-[1px] clear-both"
                      />
                    </div>
                  )}
                </div>

                <form
                  className="p-3 sm:p-4 bg-white bg-opacity-50 border-t rounded-b-[1rem] sm:rounded-b-[2rem] md:rounded-b-[3rem]"
                  onSubmit={handleSubmit}
                >
                  <div className="flex flex-row items-center gap-2">
                    <div className="flex-1">
                      <DynamicInput
                        type="text"
                        name="message"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t(
                          `${viewDictionary}.messageInput.placeholder`
                        )}
                        disabled={loading}
                      />
                    </div>
                    <DynamicButton
                      size="x-small"
                      state={loading ? 'disabled' : 'normal'}
                      type="submit"
                      onClick={handleSubmit}
                      disabled={loading}
                    />
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-[50vh] md:h-[70vh] text-gray-500 t20r sm:t24r">
                {t(`${viewDictionary}.selectChatPrompt`)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminChatPanel
