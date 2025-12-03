import { useState, useCallback } from 'react'
import {
  collection,
  addDoc,
  getDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import isEqual from 'lodash/isEqual'

/**
 * Hook para registrar y realizar seguimiento de cambios en entidades
 * @param {Object} options - Opciones de configuración
 * @param {string} options.tag - Etiqueta para categorizar el tipo de cambio (ej: 'users', 'events')
 * @param {string} options.entityType - Tipo de entidad que se está modificando (ej: 'user', 'event')
 * @returns {Object} - Funciones y utilidades para el seguimiento de cambios
 */
const useChangeTracker = ({ tag, entityType }) => {
  const [isTracking, setIsTracking] = useState(false)

  /**
   * Registra los cambios realizados en una entidad
   * @param {Object} params - Parámetros para el registro
   * @param {string} params.entityId - ID de la entidad modificada
   * @param {Object} params.changes - Objeto con los cambios {field: {oldValue, newValue}}
   * @param {string} params.modifierId - ID del usuario que realiza la modificación
   * @param {string} params.entityName - Nombre descriptivo de la entidad modificada
   * @param {string} params.changeType - Tipo de cambio (update, create, delete)
   * @param {Object} params.sensitiveFields - Campos que requieren anonimización
   * @param {Function} params.onSuccess - Callback tras registro exitoso
   * @param {Function} params.onError - Callback en caso de error
   */
  const trackChanges = useCallback(
    async ({
      entityId,
      changes,
      modifierId,
      entityName,
      changeType = 'update', // Nuevo parámetro para el tipo de cambio
      sensitiveFields = [], // Campos que necesitan ser anonimizados
      onSuccess = () => {}, // Valor por defecto para evitar errores
      onError = () => {}, // Valor por defecto para evitar errores
    }) => {
      if (!entityId || !changes || !modifierId) {
        onError(new Error('Faltan parámetros requeridos'))
        return
      }

      // Si no hay cambios, no hacemos nada
      if (Object.keys(changes).length === 0) {
        onSuccess({ noChanges: true })
        return
      }

      setIsTracking(true)

      try {
        // Obtener información del usuario que modifica para el registro
        const modifierDoc = await getDoc(doc(db, 'users', modifierId))
        const modifierData = modifierDoc.exists() ? modifierDoc.data() : {}
        const modifierInfo = {
          id: modifierId,
          name: `${modifierData.firstName || ''} ${modifierData.lastName || ''}`.trim(),
          email: modifierData.email || '',
        }

        // Crear un objeto detallado con los cambios para cada campo, anonimizando los sensibles
        const fieldsDetail = {}
        Object.keys(changes).forEach((field) => {
          // Si es un campo sensible, anonimizamos los datos
          if (sensitiveFields.includes(field)) {
            fieldsDetail[field] = {
              previousValue: '***datos protegidos***',
              newValue: '***datos protegidos***',
              isSensitive: true,
            }
          } else {
            fieldsDetail[field] = {
              previousValue: changes[field].oldValue,
              newValue: changes[field].newValue,
            }
          }
        })

        // Crear un registro consolidado con todos los detalles
        await addDoc(collection(db, 'changes'), {
          timestamp: serverTimestamp(),
          tag,
          changeType, // Tipo de cambio: update, create, delete
          targetEntityId: entityId,
          targetEntityType: entityType,
          targetEntityName: entityName,
          fieldsChanged: Object.keys(changes),
          totalFieldsChanged: Object.keys(changes).length,
          changesDetail: fieldsDetail,
          modifiedBy: modifierInfo,
          description: `${changeType === 'create' ? 'Creación' : changeType === 'delete' ? 'Eliminación' : 'Modificación'} de ${Object.keys(changes).length} campos en ${entityType} ${entityName}`,
        })

        onSuccess({ success: true })
      } catch (error) {
        onError(error)
      } finally {
        setIsTracking(false)
      }
    },
    [tag, entityType]
  )

  /**
   * Compara dos objetos y devuelve un objeto con los cambios detectados
   * Usando comparación profunda para objetos anidados
   * @param {Object} originalData - Datos originales
   * @param {Object} newData - Datos nuevos
   * @param {Array} fieldsToCompare - Lista de campos a comparar
   * @returns {Object} - Objeto con los cambios {field: {oldValue, newValue}}
   */
  const detectChanges = useCallback(
    (originalData, newData, fieldsToCompare) => {
      const changes = {}

      fieldsToCompare.forEach((field) => {
        // Usar comparación profunda para detectar cambios en objetos anidados
        if (!isEqual(originalData[field], newData[field])) {
          changes[field] = {
            oldValue: originalData[field],
            newValue: newData[field],
          }
        }
      })

      return changes
    },
    []
  )

  /**
   * Registra la creación de una nueva entidad
   * @param {Object} params - Parámetros para el registro
   */
  const trackCreation = useCallback(
    async ({
      entityId,
      entityData,
      modifierId,
      entityName,
      sensitiveFields = [],
      onSuccess = () => {},
      onError = () => {},
    }) => {
      // Convertimos los datos creados al formato de cambios
      const changes = {}
      Object.keys(entityData).forEach((field) => {
        changes[field] = {
          oldValue: null, // No hay valor anterior en creación
          newValue: entityData[field],
        }
      })

      // Usamos trackChanges con tipo "create"
      await trackChanges({
        entityId,
        changes,
        modifierId,
        entityName,
        changeType: 'create',
        sensitiveFields,
        onSuccess,
        onError,
      })
    },
    [trackChanges]
  )

  /**
   * Registra la eliminación de una entidad
   * @param {Object} params - Parámetros para el registro
   */
  const trackDeletion = useCallback(
    async ({
      entityId,
      entityData, // Datos de la entidad antes de eliminarla
      modifierId,
      entityName,
      sensitiveFields = [],
      onSuccess = () => {},
      onError = () => {},
    }) => {
      // Convertimos los datos eliminados al formato de cambios
      const changes = {}
      Object.keys(entityData).forEach((field) => {
        changes[field] = {
          oldValue: entityData[field],
          newValue: null, // No hay valor nuevo en eliminación
        }
      })

      // Usamos trackChanges con tipo "delete"
      await trackChanges({
        entityId,
        changes,
        modifierId,
        entityName,
        changeType: 'delete',
        sensitiveFields,
        onSuccess,
        onError,
      })
    },
    [trackChanges]
  )

  return {
    trackChanges,
    trackCreation,
    trackDeletion,
    detectChanges,
    isTracking,
  }
}

export default useChangeTracker
