/********************************************************************************
 * Copyright (c) 2020 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import { Action, ExternalModelSourceChangedHandler, ViewerOptions } from "@eclipse-glsp/client";
import { ApplicationShell, ConfirmDialog, Widget } from "@theia/core/lib/browser";
import { inject, injectable } from "inversify";
import { isDiagramWidgetContainer } from "sprotty-theia";

import { GLSPDiagramWidget } from "./diagram";

@injectable()
export class TheiaModelSourceChangedHandler extends ExternalModelSourceChangedHandler {

    @inject(ApplicationShell) protected readonly shell: ApplicationShell;

    async notifyModelSourceChange(modelSourceName: string, options: ViewerOptions): Promise<Action[]> {
        const element = document.getElementById(options.baseDiv);
        if (element) {
            const widget = this.shell.findWidgetForElement(element);
            if (widget) {
                const diagramWidget = this.getDiagramWidget(widget);
                if (diagramWidget instanceof GLSPDiagramWidget) {
                    return this.notifyModelSourceChangedWithWidget(diagramWidget, modelSourceName);
                }
            }
        }
        return [];
    }

    protected async notifyModelSourceChangedWithWidget(diagramWidget: GLSPDiagramWidget, modelSourceName: string): Promise<Action[]> {
        if (this.autoReload() && !diagramWidget.saveable.dirty) {
            await diagramWidget.reloadModel();
            return [];
        }
        await this.shell.activateWidget(diagramWidget.id);
        const reload = await this.showDialog(diagramWidget.title.label, modelSourceName);
        if (reload === true) {
            await diagramWidget.reloadModel();
        }
        return [];
    }

    protected autoReload(): boolean {
        return false;
    }

    protected getDiagramWidget(widget: Widget): GLSPDiagramWidget | undefined {
        if (widget instanceof GLSPDiagramWidget) {
            return widget as GLSPDiagramWidget;
        } else if (isDiagramWidgetContainer(widget) && widget.diagramWidget instanceof GLSPDiagramWidget) {
            return widget.diagramWidget as GLSPDiagramWidget;
        }
        return undefined;
    }

    protected showDialog(widgetTitle: string, modelSourceName: string): Promise<boolean | undefined> {
        const dialog = new ConfirmDialog({
            title: `Source of editor '${widgetTitle}' changed`,
            msg: `The source '${modelSourceName}' changed. Do you want to omit
            local changes and reload the editor or continue editing and ignore the changes?`,
            cancel: 'Continue editing',
            ok: 'Reload editor',
            wordWrap: 'normal',
            maxWidth: 640
        });
        return dialog.open();
    }
}
