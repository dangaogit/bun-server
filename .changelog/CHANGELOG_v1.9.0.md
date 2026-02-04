# Changelog - v1.9.0

## 🎉 New Features

- ✨ **EventModule Auto-initialization**: EventModule now automatically scans and registers event listeners with `@OnEvent` decorator
  - Framework automatically initializes event listeners during `app.listen()`
  - No need to manually call `EventModule.initializeListeners()`
  - Enabled by default with `autoScan: true` option
  - Provides extension points for customization:
    - `autoScan`: Enable/disable automatic scanning
    - `excludeListeners`: Exclude specific listener classes
    - `includeListeners`: Force register specific listener classes
  - Resolves listener instances from correct module containers

## 📝 Improvements

- ⚡ Simplified event listener setup - users no longer need to manually list all listener classes
- ⚡ Better developer experience with "convention over configuration" approach
- ⚡ Backward compatible - manual initialization still works if needed

## 📚 Documentation

- 📖 Added `skills/` directory for recording real-world problems and solutions
  - Created event module setup troubleshooting guide
  - Added quick index for finding solutions by error message
  - Included FAQ and checklist sections
- 📖 Updated README to reference skills repository
- 📖 Added complete module-based events example (`events-module-based-app.ts`)

## 🐛 Bug Fixes

- 🔧 Fixed event listener instance resolution to use module containers instead of root container
- 🔧 Ensured listener instances match those injected into controllers

## 📊 Examples

- ✅ Added `examples/02-official-modules/events-module-based-app.ts` - demonstrates fully modular event-driven architecture
- ✅ Updated examples to showcase automatic initialization

## 💡 Migration Guide

### Before (v1.8.x)

```typescript
const app = new Application({ port });
app.registerModule(AppModule);

// Manual initialization required
const rootModuleRef = ModuleRegistry.getInstance().getModuleRef(AppModule);
if (rootModuleRef?.container) {
  EventModule.initializeListeners(
    rootModuleRef.container,
    [NotificationService, AnalyticsService, AuditService],
  );
}

app.listen(port);
```

### After (v1.9.0)

```typescript
const app = new Application({ port });
app.registerModule(AppModule);

// Automatic initialization - no manual setup needed!
app.listen(port);
```

### Customization Options

```typescript
EventModule.forRoot({
  wildcard: true,
  maxListeners: 20,
  // New options
  autoScan: true,  // Enable automatic scanning (default)
  excludeListeners: [LegacyListener],  // Exclude specific listeners
  includeListeners: [CriticalListener],  // Force register specific listeners
})
```

---

**Full Changelog:**

- feat(events): add automatic event listener initialization
- feat(events): add autoScan, excludeListeners, includeListeners options
- feat(application): auto-initialize event listeners in listen() method
- feat(examples): add events-module-based-app.ts example
- docs: create skills directory for troubleshooting guides
- docs(skills): add EventModule setup guide with FAQ
- docs: update README with skills repository reference
- fix(events): resolve listeners from module containers for correct instance mapping
