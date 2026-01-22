/**
 * Plugin Manager - Handles loading and managing Qepton plugins
 */

import type {
  QeptonPlugin,
  QeptonApp,
  SnippetServiceAdapter,
  PluginCommand,
  PluginComponent,
  QeptonEvent,
  QeptonEventType,
} from './types';

type EventCallback<T = unknown> = (event: QeptonEvent<T>) => void;

class PluginManager implements QeptonApp {
  private plugins: Map<string, QeptonPlugin> = new Map();
  private adapters: Map<string, SnippetServiceAdapter> = new Map();
  private commands: Map<string, PluginCommand> = new Map();
  private components: Map<string, PluginComponent[]> = new Map();
  private eventListeners: Map<QeptonEventType, Set<EventCallback>> = new Map();
  private stores: Map<string, unknown> = new Map();

  /**
   * Register an adapter for a snippet service
   */
  registerAdapter(adapter: SnippetServiceAdapter): void {
    if (this.adapters.has(adapter.serviceType)) {
      console.warn(`Adapter for ${adapter.serviceType} already registered, replacing...`);
    }
    this.adapters.set(adapter.serviceType, adapter);
    console.log(`Registered adapter: ${adapter.serviceName}`);
  }

  /**
   * Get an adapter by service type
   */
  getAdapter(serviceType: string): SnippetServiceAdapter | undefined {
    return this.adapters.get(serviceType);
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): SnippetServiceAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Register a command
   */
  registerCommand(command: PluginCommand): void {
    if (this.commands.has(command.id)) {
      console.warn(`Command ${command.id} already registered, replacing...`);
    }
    this.commands.set(command.id, command);
  }

  /**
   * Get all registered commands
   */
  getCommands(): PluginCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Execute a command by ID
   */
  async executeCommand(commandId: string): Promise<void> {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }
    await command.execute();
  }

  /**
   * Register a component for a slot
   */
  registerComponent(component: PluginComponent): void {
    const slotComponents = this.components.get(component.slot) || [];
    slotComponents.push(component);
    this.components.set(component.slot, slotComponents);
  }

  /**
   * Get components for a slot
   */
  getComponentsForSlot(slot: string): PluginComponent[] {
    return this.components.get(slot) || [];
  }

  /**
   * Register a store
   */
  registerStore<T>(name: string, store: T): void {
    this.stores.set(name, store);
  }

  /**
   * Get a store by name
   */
  getStore<T>(name: string): T {
    const store = this.stores.get(name);
    if (!store) {
      throw new Error(`Store not found: ${name}`);
    }
    return store as T;
  }

  /**
   * Install a plugin
   */
  installPlugin(plugin: QeptonPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already installed`);
    }

    try {
      plugin.install(this);
      this.plugins.set(plugin.id, plugin);
      console.log(`Plugin installed: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      console.error(`Failed to install plugin ${plugin.id}:`, error);
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  uninstallPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    try {
      plugin.uninstall?.();
      this.plugins.delete(pluginId);
      console.log(`Plugin uninstalled: ${plugin.name}`);
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Get all installed plugins
   */
  getInstalledPlugins(): QeptonPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Subscribe to events
   */
  on<T>(eventType: QeptonEventType, callback: EventCallback<T>): () => void {
    const listeners = this.eventListeners.get(eventType) || new Set();
    listeners.add(callback as EventCallback);
    this.eventListeners.set(eventType, listeners);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback as EventCallback);
    };
  }

  /**
   * Emit an event
   */
  emit<T>(eventType: QeptonEventType, payload: T): void {
    const event: QeptonEvent<T> = {
      type: eventType,
      payload,
      timestamp: Date.now(),
    };

    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }
}

// Singleton instance
export const pluginManager = new PluginManager();

export default pluginManager;
