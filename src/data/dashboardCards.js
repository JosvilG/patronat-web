export const cards = [
  {
    id: 'events',
    titleKey: 'dashboard.cards.events.title',
    descriptionKey: 'dashboard.cards.events.description',
    icon: '📅',
    actions: [
      {
        id: 'create-event',
        titleKey: 'dashboard.cards.events.actions.create',
        route: '/new-event',
        type: 'add',
      },
      {
        id: 'events-control-list',
        titleKey: 'dashboard.cards.events.actions.list',
        route: '/events-control-list',
        type: 'view',
      },
    ],
  },
  {
    id: 'users',
    titleKey: 'dashboard.cards.users.title',
    descriptionKey: 'dashboard.cards.users.description',
    icon: '👤',
    actions: [
      {
        id: 'manage-users',
        titleKey: 'dashboard.cards.users.actions.manage',
        route: '/users-list',
        type: 'edit',
      },
      {
        id: 'user-history',
        titleKey: 'dashboard.cards.users.actions.history',
        route: '/users-history',
        type: 'view',
      },
    ],
  },
  {
    id: 'socios',
    titleKey: 'dashboard.cards.socios.title',
    descriptionKey: 'dashboard.cards.socios.description',
    icon: '🤝',
    actions: [
      {
        id: 'create-partner',
        titleKey: 'dashboard.cards.socios.actions.create',
        route: '/admin-partner-form',
        type: 'edit',
      },
      {
        id: 'manage-partner',
        titleKey: 'dashboard.cards.socios.actions.manage',
        route: '/partners-list',
        type: 'edit',
      },
    ],
  },
  {
    id: 'payments',
    titleKey: 'dashboard.cards.payments.title',
    descriptionKey: 'dashboard.cards.payments.description',
    icon: '💳',
    actions: [
      {
        id: 'create-new-payment',
        titleKey: 'dashboard.cards.payments.actions.create',
        route: '/new-season',
        type: 'edit',
      },
      {
        id: 'seasons-list',
        titleKey: 'dashboard.cards.payments.actions.list',
        route: '/seasons-list',
        type: 'edit',
      },
    ],
  },
  {
    id: 'colaboradores',
    titleKey: 'dashboard.cards.colaboradores.title',
    descriptionKey: 'dashboard.cards.colaboradores.description',
    icon: '🤲',
    actions: [
      {
        id: 'create-collaborator',
        titleKey: 'dashboard.cards.colaboradores.actions.create',
        route: '/new-collaborator',
        type: 'add',
      },
      {
        id: 'list-collaborator',
        titleKey: 'dashboard.cards.colaboradores.actions.list',
        route: '/list-collaborator',
        type: 'view',
      },
    ],
  },
  {
    id: 'participantes',
    titleKey: 'dashboard.cards.participantes.title',
    descriptionKey: 'dashboard.cards.participantes.description',
    icon: '🎵',
    actions: [
      {
        id: 'create-participants',
        titleKey: 'dashboard.cards.participantes.actions.create',
        route: '/new-participant',
        type: 'add',
      },
      {
        id: 'list-participants',
        titleKey: 'dashboard.cards.participantes.actions.list',
        route: '/list-participant',
        type: 'view',
      },
    ],
  },
  {
    id: 'penas',
    titleKey: 'dashboard.cards.penas.title',
    descriptionKey: 'dashboard.cards.penas.description',
    icon: '🍻',
    actions: [
      {
        id: 'new-crew',
        titleKey: 'dashboard.cards.penas.actions.create',
        route: '/new-crew',
        type: 'add',
      },
      {
        id: 'crews-list',
        titleKey: 'dashboard.cards.penas.actions.list',
        route: '/crews-list',
        type: 'edit',
      },
      {
        id: 'pena-history',
        titleKey: 'dashboard.cards.penas.actions.history',
        route: '/pena-history',
        type: 'view',
      },
      {
        id: 'crew-points',
        titleKey: 'dashboard.cards.penas.actions.points',
        route: '/crew-points',
        type: 'view',
      },
    ],
  },
  {
    id: 'pruebas',
    titleKey: 'dashboard.cards.pruebas.title',
    descriptionKey: 'dashboard.cards.pruebas.description',
    icon: '🍻',
    actions: [
      {
        id: 'games-register',
        titleKey: 'dashboard.cards.pruebas.actions.create',
        route: '/games-register',
        type: 'add',
      },
      {
        id: 'games-list',
        titleKey: 'dashboard.cards.pruebas.actions.list',
        route: '/games-list',
        type: 'edit',
      },
      {
        id: 'gimcana-register',
        titleKey: 'dashboard.cards.pruebas.actions.gimcana-register',
        route: '/gimcana-register',
        type: 'edit',
      },
      {
        id: ' gimcana-results',
        titleKey: 'dashboard.cards.pruebas.actions.gimcana-results',
        route: '/gimcana-results',
        type: 'edit',
      },
    ],
  },
  {
    id: 'archivos',
    titleKey: 'dashboard.cards.archivos.title',
    descriptionKey: 'dashboard.cards.archivos.description',
    icon: '🖼️',
    actions: [
      {
        id: 'add-files',
        titleKey: 'dashboard.cards.archivos.actions.add',
        route: '/upload-file',
        type: 'add',
      },
      {
        id: 'upload-list',
        titleKey: 'dashboard.cards.archivos.actions.list',
        route: '/upload-list',
        type: 'view',
      },
    ],
  },
  {
    id: 'chat',
    titleKey: 'dashboard.cards.chat.title',
    descriptionKey: 'dashboard.cards.chat.description',
    icon: '💬',
    actions: [
      {
        id: 'contact-menu',
        titleKey: 'dashboard.cards.chat.actions.sendMessages',
        route: '/contact-menu',
        type: 'submit',
      },
      {
        id: 'admin-chat',
        titleKey: 'dashboard.cards.chat.actions.live',
        route: '/admin-chat',
        type: 'submit',
      },
    ],
  },
  {
    id: 'reports',
    titleKey: 'dashboard.cards.reports.title',
    descriptionKey: 'dashboard.cards.reports.description',
    icon: '📊',
    route: '/reportes',
  },
]
