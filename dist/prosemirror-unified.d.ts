import { Attrs } from 'prosemirror-model';
import { Command } from 'prosemirror-state';
import { InputRule } from 'prosemirror-inputrules';
import { Mark } from 'prosemirror-model';
import { MarkSpec } from 'prosemirror-model';
import { MarkType } from 'prosemirror-model';
import { Node as Node_2 } from 'prosemirror-model';
import { Node as Node_3 } from 'unist';
import { NodeSpec } from 'prosemirror-model';
import { NodeViewConstructor } from 'prosemirror-view';
import { Plugin as Plugin_2 } from 'prosemirror-state';
import { Processor } from 'unified';
import { Schema } from 'prosemirror-model';

/**
 * @public
 */
export declare function createProseMirrorNode(nodeName: string | null, schema: Schema<string, string>, children: Array<Node_2>, attrs?: Attrs): Array<Node_2>;

/**
 * @public
 */
export declare abstract class Extension {
    dependencies(): Array<Extension>;
    unifiedInitializationHook(processor: Processor<Node_3, Node_3, Node_3, Node_3, string>): Processor<Node_3, Node_3, Node_3, Node_3, string>;
}

/**
 * @public
 */
export declare abstract class MarkExtension<UNode extends Node_3, UnistToProseMirrorContext extends Record<string, unknown> = Record<string, never>> extends SyntaxExtension<UNode, UnistToProseMirrorContext> {
    abstract processConvertedUnistNode(convertedNode: Node_3, originalMark: Mark): UNode;
    abstract proseMirrorMarkName(): string | null;
    abstract proseMirrorMarkSpec(): MarkSpec | null;
}

/**
 * @public
 */
export declare class MarkInputRule extends InputRule {
    private readonly markType;
    constructor(matcher: RegExp, markType: MarkType);
    private static markApplies;
    private markHandler;
}

/**
 * @public
 */
export declare abstract class NodeExtension<UNode extends Node_3, UnistToProseMirrorContext extends Record<string, unknown> = Record<string, never>> extends SyntaxExtension<UNode, UnistToProseMirrorContext> {
    abstract proseMirrorNodeName(): string | null;
    abstract proseMirrorNodeSpec(): NodeSpec | null;
    abstract proseMirrorNodeToUnistNodes(node: Node_2, convertedChildren: Array<Node_3>): Array<UNode>;
    proseMirrorNodeView(): NodeViewConstructor | null;
    proseMirrorToUnistTest(node: Node_2): boolean;
}

/**
 * @public
 */
export declare class ProseMirrorUnified {
    private readonly builtSchema;
    private readonly inputRulesBuilder;
    private readonly keymapBuilder;
    private readonly nodeViewBuilder;
    private readonly proseMirrorToUnistConverter;
    private readonly unified;
    private readonly unistToProseMirrorConverter;
    constructor(extensions?: Array<Extension>);
    inputRulesPlugin(): Plugin_2;
    keymapPlugin(): Plugin_2;
    nodeViews(): Record<string, NodeViewConstructor>;
    parse(source: string): Node_2;
    schema(): Schema<string, string>;
    serialize(doc: Node_2): string;
}

/**
 * @public
 */
export declare abstract class SyntaxExtension<UNode extends Node_3, UnistToProseMirrorContext extends Record<string, unknown> = Record<string, never>> extends Extension {
    postUnistToProseMirrorHook(context: Partial<UnistToProseMirrorContext>): void;
    proseMirrorInputRules(proseMirrorSchema: Schema<string, string>): Array<InputRule>;
    proseMirrorKeymap(proseMirrorSchema: Schema<string, string>): Record<string, Command>;
    abstract unistNodeName(): UNode["type"];
    abstract unistNodeToProseMirrorNodes(node: UNode, schema: Schema<string, string>, convertedChildren: Array<Node_2>, context: Partial<UnistToProseMirrorContext>): Array<Node_2>;
    unistToProseMirrorTest(node: Node_3): boolean;
}

export { }
