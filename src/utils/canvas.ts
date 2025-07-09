import {AgentNode} from "../app/core/models/AgentBuilder";
import Konva from "konva";

export interface DiagramNode {
    id: string;
    type: string;
    x: number;
    y: number;
    label: string;
    color: string;
    icon: string;
    data: AgentNode;
}


export class CanvasUtils {

    static drawAgentNode(layer: Konva.Layer, node: DiagramNode, callback: any) {
        const group = new Konva.Group({
            x: 100, // Initial position of the group
            y: 100, // Initial position of the group
            draggable: true, // Make the entire group draggable
        });
        // Create the rectangle
        const rect = new Konva.Rect({
            width: 300,
            height: 300,
            fill: node.color,
            cornerRadius: 10
        });

        // Create the label (Text)
        const label = new Konva.Text({
            x: 20, // Position relative to the group
            y: 20, // Position relative to the group
            text: node.icon + node.label,
            fontSize: 20,
            fontFamily: 'Google Sans',
            fill: '#E2E8F0',
        });

        const agentTypeChip = new Konva.Label({
            x: 20,
            y: 50,
            opacity: 0.75
        })

        agentTypeChip.add(new Konva.Tag({
            fill: 'yellow'
        }))
        agentTypeChip.add(new Konva.Text({
            text: node.data.agentType,
            fontFamily: 'Google Sans',
            fontSize: 18,
            padding: 5,
            fill: 'black',
            name: 'agent-type'
        }))

        const modelChip = new Konva.Label({
            x: 20,
            y: 80,
            opacity: 0.75
        })

        modelChip.add(new Konva.Tag({
            fill: 'yellow'
        }))
        modelChip.add(new Konva.Text({
            text: node.data.model,
            fontFamily: 'Google Sans',
            fontSize: 18,
            padding: 5,
            fill: 'black',
            name: 'agent-model'
        }))

        const instructionText = new Konva.Text({
            x: 20,
            y: 120,
            text: node.data.instructions,
            height: 100,
            fontSize: 18,
            fontFamily: 'Google Sans',
            fill: 'black',
            width: 250,
            padding: 10,
            ellipsis: true,
            align: 'left',
            name: 'agent-instructions'
        });

        const instructionRect = new Konva.Rect({
            x: 20,
            y: 120,
            stroke: '#555',
            strokeWidth: 2,
            fill: '#ddd',
            width: 250,
            height: instructionText.height(),
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffsetX: 10,
            shadowOffsetY: 10,
            shadowOpacity: 0.2,
            cornerRadius: 10
        });

        const settingsIcon = new Konva.Text({
            x: rect.width() - 40, // Position it inside the button
            y: 15,
            text: 'settings', // Material Icons "three vertical dots" icon name
            fontSize: 24,
            fontFamily: 'Material Icons', // Font family set to Material Icons
            fill: '#E2E8F0',
        });

        settingsIcon.on('click', function () {
            if (callback) {
                callback(node, group);
            }
        });

        // Add the rectangle and label to the group
        group.add(rect);
        group.add(label);
        group.add(agentTypeChip);
        group.add(modelChip);
        group.add(instructionRect);
        group.add(instructionText);
        group.add(settingsIcon);

        layer.add(group);
        layer.draw();
    }

}