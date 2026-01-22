export default {
  app: {
    name: 'Qepton',
    tagline: 'Gestor de Fragmentos de Código',
    version: 'Versión {version}'
  },

  // Navigation & Layout
  nav: {
    allGists: 'Todos los Gists',
    starred: 'Favoritos',
    languages: 'Lenguajes',
    tags: 'Etiquetas',
    settings: 'Configuración'
  },

  // Authentication
  auth: {
    login: 'Iniciar Sesión',
    logout: 'Cerrar Sesión',
    logoutConfirm: '¿Estás seguro de que quieres cerrar sesión?',
    loginWithOAuth: 'Iniciar con GitHub',
    loginWithToken: 'Iniciar con Token',
    tokenPlaceholder: 'Token de Acceso Personal de GitHub',
    tokenHint: "Pega tu token de GitHub con el permiso 'gist'",
    tokenRequired: 'El token es obligatorio',
    invalidToken: 'Token de GitHub inválido',
    generateToken: 'Generar un nuevo token',
    welcome: '¡Bienvenido, {name}!'
  },

  // Gists
  gists: {
    title: 'Gists',
    allGists: 'Todos los Gists',
    create: 'Nuevo Gist',
    edit: 'Editar Gist',
    delete: 'Eliminar Gist',
    sync: 'Sincronizar',
    syncing: 'Sincronizando...',
    lastSync: 'Última sincronización: {time}',
    noGists: 'No se encontraron gists',
    noResults: 'Ningún gist coincide con tu búsqueda',
    loadingGists: 'Cargando gists...',
    gistCount: '{count} Gist | {count} Gists',
    publicGist: 'Público',
    secretGist: 'Secreto',
    created: 'Creado {date}',
    updated: 'Actualizado {date}',
    files: '{count} archivo | {count} archivos',
    confirmDelete: '¿Estás seguro de que quieres eliminar este gist?',
    deleteSuccess: 'Gist eliminado correctamente',
    syncSuccess: '{count} gists sincronizados',
    syncError: 'Error al sincronizar gists'
  },

  // Files
  files: {
    filename: 'Nombre de archivo',
    language: 'Lenguaje',
    size: 'Tamaño',
    content: 'Contenido',
    copy: 'Copiar',
    copySuccess: 'Copiado al portapapeles',
    download: 'Descargar',
    raw: 'Sin formato'
  },

  // Search
  search: {
    placeholder: 'Buscar gists...',
    noResults: 'No se encontraron resultados',
    results: '{count} resultado | {count} resultados',
    filterByLanguage: 'Filtrar por lenguaje',
    filterByTag: 'Filtrar por etiqueta',
    sortBy: 'Ordenar por',
    sortNewest: 'Más recientes primero',
    sortOldest: 'Más antiguos primero',
    sortName: 'Nombre A-Z'
  },

  // Tags
  tags: {
    title: 'Etiquetas',
    noTags: 'Sin etiquetas',
    addTag: 'Añadir etiqueta',
    removeTag: 'Quitar etiqueta',
    pinnedTags: 'Etiquetas Fijadas',
    allTags: 'Todas las Etiquetas',
    tagCount: '{count} gist | {count} gists'
  },

  // Export
  export: {
    title: 'Exportar',
    exportGist: 'Exportar Gist',
    exportAll: 'Exportar Todos los Gists',
    asJSON: 'Exportar como JSON',
    asMarkdown: 'Exportar como Markdown',
    includeMetadata: 'Incluir metadatos',
    success: '{count} gist exportado | {count} gists exportados',
    error: 'Error en la exportación'
  },

  // Settings
  settings: {
    title: 'Configuración',
    appearance: 'Apariencia',
    theme: 'Tema',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    themeAuto: 'Sistema',
    language: 'Idioma',
    editor: 'Editor',
    fontSize: 'Tamaño de fuente',
    lineNumbers: 'Mostrar números de línea',
    wordWrap: 'Ajuste de línea',
    notifications: 'Notificaciones',
    enableNotifications: 'Activar notificaciones',
    about: 'Acerca de',
    checkUpdates: 'Buscar actualizaciones',
    version: 'Versión',
    github: 'Repositorio de GitHub'
  },

  // User
  user: {
    profile: 'Perfil',
    gistCount: '{count} Gists',
    memberSince: 'Miembro desde {date}'
  },

  // Actions
  actions: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    copy: 'Copiar',
    share: 'Compartir',
    refresh: 'Actualizar',
    close: 'Cerrar',
    confirm: 'Confirmar',
    back: 'Atrás',
    next: 'Siguiente',
    loading: 'Cargando...',
    retry: 'Reintentar'
  },

  // Errors
  errors: {
    generic: 'Algo salió mal',
    network: 'Error de red. Por favor, comprueba tu conexión.',
    unauthorized: 'Sesión expirada. Por favor, inicia sesión de nuevo.',
    notFound: 'No encontrado',
    rateLimited: 'Límite de peticiones alcanzado. Por favor, espera un momento.',
    serverError: 'Error del servidor. Por favor, inténtalo más tarde.'
  },

  // Time
  time: {
    justNow: 'Ahora mismo',
    minutesAgo: 'hace {count} minuto | hace {count} minutos',
    hoursAgo: 'hace {count} hora | hace {count} horas',
    daysAgo: 'hace {count} día | hace {count} días',
    yesterday: 'Ayer',
    never: 'Nunca'
  }
}
