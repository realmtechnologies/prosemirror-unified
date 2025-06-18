import { InputRule, inputRules } from "prosemirror-inputrules";
import { SelectionRange } from "prosemirror-state";
import { baseKeymap, chainCommands } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import { unified } from "unified";
function createProseMirrorNode(nodeName, schema, children, attrs = {}) {
  if (nodeName === null) {
    return [];
  }
  const proseMirrorNode = schema.nodes[nodeName].createAndFill(attrs, children);
  if (proseMirrorNode === null) {
    return [];
  }
  return [proseMirrorNode];
}
class Extension {
  /* eslint-disable @typescript-eslint/class-methods-use-this -- Invalid for interfaces */
  dependencies() {
    return [];
  }
  unifiedInitializationHook(processor) {
    return processor;
  }
  /* eslint-enable */
}
class SyntaxExtension extends Extension {
  /* eslint-disable @typescript-eslint/class-methods-use-this, @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars -- These are invalid for interfaces */
  postUnistToProseMirrorHook(context) {
  }
  proseMirrorInputRules(proseMirrorSchema) {
    return [];
  }
  proseMirrorKeymap(proseMirrorSchema) {
    return {};
  }
  unistToProseMirrorTest(node) {
    return node.type === this.unistNodeName();
  }
}
class MarkExtension extends SyntaxExtension {
}
class MarkInputRule extends InputRule {
  constructor(matcher, markType) {
    super(
      matcher,
      (state, match, start, end) => this.markHandler(state, match, start, end)
    );
    this.markType = markType;
  }
  static markApplies(doc, ranges, type) {
    for (const range of ranges) {
      const { $from, $to } = range;
      let applies = $from.depth === 0 ? doc.type.allowsMarkType(type) : false;
      doc.nodesBetween($from.pos, $to.pos, (node) => {
        if (applies) {
          return false;
        }
        applies = node.inlineContent && node.type.allowsMarkType(type);
        return true;
      });
      if (applies) {
        return true;
      }
    }
    return false;
  }
  markHandler(state, match, start, end) {
    var _a;
    const $start = state.doc.resolve(start);
    const $end = state.doc.resolve(end);
    const range = [new SelectionRange($start, $end)];
    if (!MarkInputRule.markApplies(state.doc, range, this.markType)) {
      return null;
    }
    const newMarks = ((_a = state.doc.nodeAt(start)) == null ? void 0 : _a.marks.map((mark) => mark.type)) ?? [];
    newMarks.push(this.markType);
    const tr = state.tr.replaceWith(
      start,
      end,
      this.markType.schema.text(match[1])
    );
    for (const markType of newMarks) {
      tr.addMark(
        tr.mapping.map(start),
        tr.mapping.map(end),
        markType.create(null)
      );
    }
    for (const markType of newMarks) {
      tr.removeStoredMark(markType);
    }
    if (match[2] !== "\n") {
      tr.insertText(match[2]);
    }
    return tr;
  }
}
class NodeExtension extends SyntaxExtension {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- Inalid for an interface
  proseMirrorNodeView() {
    return null;
  }
  proseMirrorToUnistTest(node) {
    return this.proseMirrorNodeName() === node.type.name;
  }
}
class ExtensionManager {
  constructor(extensions) {
    this.markExtensionList = /* @__PURE__ */ new Map();
    this.nodeExtensionList = /* @__PURE__ */ new Map();
    this.otherExtensionList = /* @__PURE__ */ new Map();
    for (const extension of extensions) {
      this.add(extension);
    }
  }
  extensions() {
    return this.syntaxExtensions().concat(
      Array.from(this.otherExtensionList.values())
    );
  }
  markExtensions() {
    return Array.from(this.markExtensionList.values());
  }
  nodeExtensions() {
    return Array.from(this.nodeExtensionList.values());
  }
  syntaxExtensions() {
    return this.nodeExtensions().concat(
      this.markExtensions()
    );
  }
  add(extension) {
    for (const dependency of extension.dependencies()) {
      this.add(dependency);
    }
    if (isMarkExtension(extension)) {
      this.markExtensionList.set(extension.constructor.name, extension);
      return;
    }
    if (isNodeExtension(extension)) {
      this.nodeExtensionList.set(extension.constructor.name, extension);
      return;
    }
    this.otherExtensionList.set(extension.constructor.name, extension);
  }
}
function isMarkExtension(extension) {
  return extension instanceof MarkExtension;
}
function isNodeExtension(extension) {
  return extension instanceof NodeExtension;
}
class InputRulesBuilder {
  constructor(extensionManager, proseMirrorSchema) {
    this.rules = [].concat.apply(
      [],
      extensionManager.syntaxExtensions().map((extension) => extension.proseMirrorInputRules(proseMirrorSchema))
    );
  }
  build() {
    var _a;
    const inputRulesPlugin = inputRules({ rules: this.rules });
    const originalHandleKeyDown = (_a = inputRulesPlugin.props.handleKeyDown) == null ? void 0 : _a.bind(inputRulesPlugin);
    inputRulesPlugin.props.handleKeyDown = (view, event) => {
      var _a2;
      if (event.key === "Enter") {
        const { from, to } = view.state.selection;
        (_a2 = inputRulesPlugin.props.handleTextInput) == null ? void 0 : _a2.call(
          inputRulesPlugin,
          view,
          from,
          to,
          "\n"
        );
      }
      return originalHandleKeyDown == null ? void 0 : originalHandleKeyDown(view, event);
    };
    return inputRulesPlugin;
  }
}
class KeymapBuilder {
  constructor(extensionManager, proseMirrorSchema) {
    this.keymap = /* @__PURE__ */ new Map();
    for (const extension of extensionManager.syntaxExtensions()) {
      this.addKeymap(extension.proseMirrorKeymap(proseMirrorSchema));
    }
    this.addKeymap(baseKeymap);
  }
  build() {
    const chainedKeymap = {};
    this.keymap.forEach((commands, key) => {
      chainedKeymap[key] = chainCommands(...commands);
    });
    return keymap(chainedKeymap);
  }
  addKeymap(map) {
    for (const key in map) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) {
        continue;
      }
      if (!this.keymap.get(key)) {
        this.keymap.set(key, []);
      }
      this.keymap.get(key).push(map[key]);
    }
  }
}
class NodeViewBuilder {
  constructor(extensionManager) {
    this.nodeViews = {};
    for (const extension of extensionManager.nodeExtensions()) {
      const proseMirrorNodeName = extension.proseMirrorNodeName();
      const proseMirrorNodeView = extension.proseMirrorNodeView();
      if (proseMirrorNodeName !== null && proseMirrorNodeView !== null) {
        this.nodeViews[proseMirrorNodeName] = proseMirrorNodeView;
      }
    }
  }
  build() {
    return this.nodeViews;
  }
}
class ProseMirrorToUnistConverter {
  constructor(extensionManager) {
    this.extensionManager = extensionManager;
  }
  convert(node) {
    const rootNode = this.convertNode(node);
    if (rootNode.length !== 1) {
      throw new Error(
        "Couldn't find any way to convert the root ProseMirror node."
      );
    }
    return rootNode[0];
  }
  convertNode(node) {
    let convertedNodes = null;
    for (const extension of this.extensionManager.nodeExtensions()) {
      if (!extension.proseMirrorToUnistTest(node)) {
        continue;
      }
      let convertedChildren = [];
      for (let i = 0; i < node.childCount; ++i) {
        convertedChildren = convertedChildren.concat(
          this.convertNode(node.child(i))
        );
      }
      convertedNodes = extension.proseMirrorNodeToUnistNodes(
        node,
        convertedChildren
      );
    }
    if (convertedNodes === null) {
      console.warn(
        `Couldn't find any way to convert ProseMirror node of type "${node.type.name}" to a unist node.`
      );
      return [];
    }
    return convertedNodes.map((convertedNode) => {
      let postProcessedNode = convertedNode;
      for (const mark of node.marks) {
        let processed = false;
        for (const extension of this.extensionManager.markExtensions()) {
          if (mark.type.name === extension.proseMirrorMarkName()) {
            postProcessedNode = extension.processConvertedUnistNode(
              postProcessedNode,
              mark
            );
            processed = true;
          }
        }
        if (!processed) {
          console.warn(
            `Couldn't find any way to convert ProseMirror mark of type "${mark.type.name}" to a unist node.`
          );
        }
      }
      return postProcessedNode;
    });
  }
}
class SchemaBuilder {
  constructor(extensionManager) {
    this.marks = {};
    this.nodes = {};
    for (const extension of extensionManager.nodeExtensions()) {
      const name = extension.proseMirrorNodeName();
      const spec = extension.proseMirrorNodeSpec();
      if (name !== null && spec !== null) {
        this.nodes[name] = spec;
      }
    }
    for (const extension of extensionManager.markExtensions()) {
      const name = extension.proseMirrorMarkName();
      const spec = extension.proseMirrorMarkSpec();
      if (name !== null && spec !== null) {
        this.marks[name] = spec;
      }
    }
  }
  build() {
    return new Schema({
      marks: this.marks,
      nodes: this.nodes
    });
  }
}
class UnifiedBuilder {
  constructor(extensionManager) {
    this.extensionManager = extensionManager;
  }
  build() {
    let processor = unified();
    for (const extension of this.extensionManager.extensions()) {
      processor = extension.unifiedInitializationHook(processor);
    }
    return processor;
  }
}
class UnistToProseMirrorConverter {
  constructor(extensionManager, proseMirrorSchema) {
    this.extensionManager = extensionManager;
    this.proseMirrorSchema = proseMirrorSchema;
  }
  static unistNodeIsParent(node) {
    return "children" in node;
  }
  convert(unist) {
    const context = {};
    const rootNode = this.convertNode(unist, context);
    for (const extension of this.extensionManager.syntaxExtensions()) {
      extension.postUnistToProseMirrorHook(context);
    }
    if (rootNode.length !== 1) {
      throw new Error("Couldn't find any way to convert the root unist node.");
    }
    return rootNode[0];
  }
  convertNode(node, context) {
    for (const extension of this.extensionManager.syntaxExtensions()) {
      if (!extension.unistToProseMirrorTest(node)) {
        continue;
      }
      let convertedChildren = [];
      if (UnistToProseMirrorConverter.unistNodeIsParent(node)) {
        convertedChildren = [].concat.apply(
          [],
          node.children.map((child) => this.convertNode(child, context))
        );
      }
      return extension.unistNodeToProseMirrorNodes(
        node,
        this.proseMirrorSchema,
        convertedChildren,
        context
      );
    }
    console.warn(
      `Couldn't find any way to convert unist node of type "${node.type}" to a ProseMirror node.`
    );
    return [];
  }
}
class ProseMirrorUnified {
  constructor(extensions = []) {
    const extensionManager = new ExtensionManager(extensions);
    this.builtSchema = new SchemaBuilder(extensionManager).build();
    this.inputRulesBuilder = new InputRulesBuilder(
      extensionManager,
      this.builtSchema
    );
    this.keymapBuilder = new KeymapBuilder(extensionManager, this.builtSchema);
    this.nodeViewBuilder = new NodeViewBuilder(extensionManager);
    this.unistToProseMirrorConverter = new UnistToProseMirrorConverter(
      extensionManager,
      this.builtSchema
    );
    this.proseMirrorToUnistConverter = new ProseMirrorToUnistConverter(
      extensionManager
    );
    this.unified = new UnifiedBuilder(extensionManager).build();
  }
  inputRulesPlugin() {
    return this.inputRulesBuilder.build();
  }
  keymapPlugin() {
    return this.keymapBuilder.build();
  }
  nodeViews() {
    return this.nodeViewBuilder.build();
  }
  parse(source) {
    const unist = this.unified.runSync(this.unified.parse(source));
    const ret = this.unistToProseMirrorConverter.convert(unist);
    return ret;
  }
  schema() {
    return this.builtSchema;
  }
  serialize(doc) {
    const unist = this.proseMirrorToUnistConverter.convert(doc);
    const source = this.unified.stringify(unist);
    return source;
  }
}
export {
  Extension,
  MarkExtension,
  MarkInputRule,
  NodeExtension,
  ProseMirrorUnified,
  SyntaxExtension,
  createProseMirrorNode
};
//# sourceMappingURL=prosemirror-unified.js.map
