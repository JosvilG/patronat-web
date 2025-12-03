import React from 'react';

export default function LegalComponent() {
  return (
    <div className="container p-6 mx-auto space-y-8">
      {/* Aviso Legal */}
      <section id="aviso-legal">
        <h1 className="mb-4 text-2xl font-bold">Aviso Legal</h1>
        <p className="mb-2">
          <strong>Responsable del sitio:</strong> Patronato de Fiestas "Mi Pueblo", NIF: X1234567A, Calle Principal 1, 28001 Madrid, España. Correo: contacto@patronatofiestas.es.
        </p>
        <p className="mb-2">
          <strong>Inscripción Registral:</strong> Registro Municipal de Asociaciones Nº 12345.
        </p>
        <p className="mb-2">
          <strong>Actividad de la web:</strong> Información sobre eventos y fiestas, gestión de usuarios y socios, y venta de entradas online.
        </p>
        <p className="mb-2">
          <strong>Condiciones de uso:</strong> El Patronato se reserva el derecho a modificar contenidos sin previo aviso. Todos los derechos de propiedad intelectual e industrial del diseño, logotipo y textos son propiedad exclusiva del Patronato.
        </p>
        <p className="mb-2">
          El Patronato no se responsabiliza de posibles errores en la información ni de los daños derivados de su uso.
        </p>
        <p>
          <strong>Hosting y Dominio:</strong> Este sitio está alojado en Firebase Hosting (Google LLC), que actúa como proveedor técnico.
        </p>
      </section>

      {/* Política de Privacidad */}
      <section id="politica-privacidad">
        <h1 className="mb-4 text-2xl font-bold">Política de Privacidad</h1>
        <p className="mb-2">
          <strong>Responsable del Tratamiento:</strong> Patronato de Fiestas "Mi Pueblo", NIF: X1234567A, Calle Principal 1, 28001 Madrid, España. Email: rgpd@patronatofiestas.es.
        </p>
        <p className="mb-2">
          <strong>Finalidades y bases jurídicas:</strong>
        </p>
        <ul className="mb-2 list-disc list-inside">
          <li>
            <strong>Usuarios registrados:</strong> Recabar nombre, apellidos, DNI, teléfono, correo, fecha de nacimiento y contraseña. Base: Consentimiento (art. 6.1.a RGPD). Finalidad: gestión de cuentas, envío de comunicaciones sobre fiestas y eventos.
          </li>
          <li>
            <strong>Socios:</strong> Además de los datos anteriores, se recaba dirección y, en el futuro, IBAN. Base: Ejecución de un contrato (art. 6.1.b RGPD) para cobro de cuotas; Consentimiento explícito para IBAN.
          </li>
          <li>
            <strong>Clientes tienda online:</strong> Al comprar entradas se recaban nombre, apellidos, DNI, correo, teléfono, dirección postal y datos de pago. Base: Ejecución de contrato (art. 6.1.b RGPD).
          </li>
          <li>
            <strong>Envío de correos masivos:</strong> Emails para boletines y comunicaciones puntuales. Base: Consentimiento o legítimo interés (art. 6.1.f RGPD).
          </li>
        </ul>
        <p className="mb-2">
          <strong>Destinatarios:</strong> Google/Firebase (como encargado de tratamiento), proveedor de pasarela de pago (TPV virtual), entidad bancaria (en el caso de IBAN), asesoría contable, proveedores de envío de correos.
        </p>
        <p className="mb-2">
          <strong>Plazos de conservación:</strong>
        </p>
        <ul className="mb-2 list-disc list-inside">
          <li>Usuarios activos: mientras la cuenta esté activa, + 1 año tras baja.</li>
          <li>Socios: mientras dure la condición de socio, + 5 años por obligaciones contables.</li>
          <li>Clientes ecommerce: 6 años por obligación fiscal (conservación de facturas).</li>
          <li>Listas de correo: hasta que el usuario retire el consentimiento o solicite baja.</li>
        </ul>
        <p className="mb-2">
          <strong>Derechos de los interesados:</strong> Tienes derecho a Acceder, Rectificar, Suprimir, Limitar el tratamiento, Oponerte y Portar tus datos (DRIP). Para ejercerlos, envía un correo a rgpd@patronatofiestas.es. Respondemos en un plazo máximo de 1 mes.
        </p>
        <p className="mb-2">
          <strong>Transferencias internacionales:</strong> Firebase almacena datos en Google Cloud con servidores en la UE. Google aplica Cláusulas Contractuales Tipo (SCC) y el DPA de Firebase garantiza la legalidad de las transferencias.
        </p>
        <p>
          <strong>Seguridad:</strong> HTTPS en todo el sitio, Firestore cifrado en reposo por Google, reglas de seguridad de Firestore para control de accesos por roles, cifrado de IBAN en base de datos propia, backups cifrados y registro de accesos.
        </p>
      </section>

      {/* Política de Cookies */}
      <section id="politica-cookies">
        <h1 className="mb-4 text-2xl font-bold">Política de Cookies</h1>
        <p className="mb-2">
          Este sitio web utiliza cookies propias y de terceros para mejorar la experiencia de usuario y analizar el tráfico.
        </p>
        <p className="mb-2">
          <strong>Cookies propias:</strong>
        </p>
        <ul className="mb-2 list-disc list-inside">
          <li>Cookies de sesión de Firebase Auth (token de usuario).</li>
          <li>Cookies de estado de interfaz y preferencias (ej. idioma).</li>
        </ul>
        <p className="mb-2">
          <strong>Cookies de terceros:</strong>
        </p>
        <ul className="mb-2 list-disc list-inside">
          <li>Google Analytics: _ga, _gid, _gat.</li>
          <li>Google Fonts: fonts.googleapis.com (no almacena datos personales).</li>
        </ul>
        <p className="mb-2">
          <strong>Finalidades:</strong> Analíticas, funcionales y publicidad. Consulta nuestra configuración de cookies para aceptar, rechazar o configurar según categorías.
        </p>
        <p className="mb-2">
          <strong>Gestión de cookies:</strong> Cada usuario puede desactivar cookies en su navegador (Chrome, Firefox, Edge, Safari). Para rechazar analíticas y publicidad, utiliza el banner de cookies o configura manualmente en ajustes del navegador.
        </p>
        <p>
          Este aviso se muestra en un banner al entrar por primera vez. Para más detalles, visita <a href="/politica-cookies" className="text-blue-600 underline">Política de Cookies completa</a>.
        </p>
      </section>

      {/* Términos y Condiciones Tienda Online */}
      <section id="terminos-condiciones">
        <h1 className="mb-4 text-2xl font-bold">Términos y Condiciones de la Tienda Online</h1>
        <p className="mb-2">
          <strong>Identidad del vendedor:</strong> Patronato de Fiestas "Mi Pueblo", NIF: X1234567A, Calle Principal 1, 28001 Madrid, España. Correo: tienda@patronatofiestas.es.
        </p>
        <p className="mb-2">
          <strong>Características esenciales de las entradas:</strong> Fecha, hora, lugar, número de asientos (si aplica), validez y restricciones de acceso (mayores 18 años, menores).
        </p>
        <p className="mb-2">
          <strong>Precio total:</strong> Expresado en euros (€), con IVA reducido aplicado (10 %). Incluye costes de gestión. Si es entrada digital, se envía por email sin gastos de envío físico.
        </p>
        <p className="mb-2">
          <strong>Proceso de compra:</strong> El usuario verá un resumen del pedido antes de finalizar. Debe marcar la casilla: "He leído y acepto los Términos y Condiciones" (sin premarcar). Luego clic en "Pagar y finalizar pedido".
        </p>
        <p className="mb-2">
          <strong>Confirmación y factura:</strong> Tras el pago, se envía un email con el número de pedido, detalle del evento, importe desglosado y datos fiscales del Patronato (factura simplificada si <400 €, factura completa si >=400 €).
        </p>
        <p className="mb-2">
          <strong>Derecho de desistimiento:</strong> Las entradas de espectáculos están <u>exentas</u> del derecho de desistimiento según Real Decreto Legislativo 1/2007, art. 103.1 k. El usuario acepta esta exclusión al marcar la casilla correspondiente.
        </p>
        <p className="mb-2">
          <strong>Política de devoluciones en caso de cancelación:</strong> Si el evento se cancela, se reembolsará el importe en un plazo máximo de 14 días al mismo método de pago.
        </p>
        <p className="mb-2">
          <strong>Medios de pago:</strong> Pasarela de pago externa (Stripe/Redsys/PayPal). No almacenamos datos de tarjeta en nuestro servidor. Toda la sección de pago está cifrada con HTTPS y cumple PSD2/PCI-DSS.
        </p>
        <p>
          <strong>Validación de DNI y edad:</strong> Se solicita DNI en el formulario de compra. Para eventos con restricción de edad, el comprador declara ser mayor de 18 años marcando la casilla correspondiente.
        </p>
      </section>
    </div>
  );
}
