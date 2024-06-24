import * as cy from 'cytoscape';

export class ParentNode {
  constructor(
    private config: { id: string; parentId: string; label: string }
  ) {}

  getCytoscapeNodeDef(): cy.NodeDefinition & { pannable?: boolean } {
    return {
      group: 'nodes',
      classes: 'parentNode',
      data: {
        id: this.config.id,
        parent: this.config.parentId,
        label: this.config.label,
        type: 'dir',
      },
      selectable: false,
      grabbable: false,
      pannable: true,
    };
  }
}
