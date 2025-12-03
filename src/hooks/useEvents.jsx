import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

/**
 * Custom hook to manage events from Firebase
 *
 * This hook handles fetching, formatting and managing events data
 * from Firebase Firestore, providing a clean interface for calendar
 * and event listing components.
 *
 * @returns {Object} Events data and related functions
 */
const useEvents = () => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Loads events from Firebase and formats them for use in calendar components
   * Converts Firebase event documents to properly formatted event objects with
   * ISO standard date strings and structured data.
   */
  const loadEvents = async () => {
    try {
      // Fetch all events from Firestore
      const snapshot = await getDocs(collection(db, 'events'))
      const firebaseEvents = snapshot.docs.map((doc) => ({
        ...doc.data(),
        eventId: doc.id,
      }))

      // Format events for calendar use, filtering out invalid events
      const formattedEvents = firebaseEvents
        .map((event) => {
          const startDate = event.startDate
          const startTime = event.startTime
          const endDate = event.endDate
          const endTime = event.endTime

          // Skip events with missing date/time information
          if (!startDate || !startTime || !endDate || !endTime) {
            return null
          }

          try {
            // Create Date objects from the event's date and time strings
            const startDateTime = new Date(`${startDate}T${startTime}`)
            const endDateTime = new Date(`${endDate}T${endTime}`)

            // Skip events with invalid dates
            if (isNaN(startDateTime) || isNaN(endDateTime)) {
              return null
            }

            // Return properly formatted event object
            return {
              title: event.title,
              start: startDateTime.toISOString(),
              end: endDateTime.toISOString(),
              description: event.description,
              location: event.location,
              tags: event.tags || [],
              eventId: event.eventId,
              eventURL: event.eventURL,
              imageURL: event.imageURL,
            }
          } catch (error) {
            // Skip events that cause errors during processing
            return null
          }
        })
        .filter((event) => event !== null)

      setEvents(formattedEvents)
    } catch (error) {
      setError(error)
    } finally {
      setLoading(false)
    }
  }

  // Load events when the component mounts
  useEffect(() => {
    loadEvents()
  }, [])

  /**
   * Handles event click interactions
   *
   * @param {Object} info - Event information object from calendar component
   */
  const handleEventClick = (info) => {
    // Event handling logic can be expanded here
    const eventId = info.event.extendedProps.eventId
    // Further actions with eventId can be implemented as needed
  }

  return { events, loading, error, handleEventClick }
}

export default useEvents
