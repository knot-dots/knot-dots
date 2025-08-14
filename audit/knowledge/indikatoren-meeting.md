# Meeting-Zusammenfassung

## **Kurze Zusammenfassung**

Helena präsentierte Sebastian die aktuelle Funktionalität der Indikatoren in ihrem Tool und identifizierte mehrere UX-Probleme, insbesondere bei der Navigation und Benutzerfreundlichkeit des Prozesses zum Anlegen von Indikatoren. Sie diskutierten verschiedene technische Herausforderungen wie Berechnungsprobleme bei Zielwerten und die Komplexität der Darstellung von Indikatoren in der Anwendung. Helena und Sebastian vereinbarten, mit einem User-Story Ansatz zu beginnen, der sich zunächst auf die Darstellung von Ist-Daten im Pnk-Projekt konzentriert, bevor erweiterte Funktionalitäten für Trenddaten und gewünschte Entwicklungen implementiert werden.

## **Nächste Schritte**

### Helena

- Helena: Erstellung einer Übersicht verschiedener Indikatortypen und ihrer jeweiligen Berechnungsmethoden.
- Helena: Ausarbeitung eines Vorschlags zur Vereinfachung der Indikatorenstruktur und -verwaltung im Tool.
- Helena: Weiterleitung der KI-generierten Meetingzusammenfassung an Sebastian zur weiteren Verarbeitung.

### Sebastian

- Sebastian: Dokumentieren des aktuellen Berechnungsmodells für Indikatoren, um ein gemeinsames Verständnis im Team zu schaffen.
- Sebastian: Durchführung eines Audits der Indikatoren mithilfe von Claude KI basierend auf der Aufzeichnung des Gesprächs.
- Sebastian: Analyse der Überschneidungen zwischen den diskutierten Indikator-Anforderungen und dem PNK-Projekt.
- UX-Team: Entwicklung von Lösungen zur besseren Darstellung und Erklärung der Indikatorenberechnung für Benutzer.
- UX-Team: Überarbeitung der Benutzeroberfläche, um das Anlegen von Zielen und Maßnahmen direkt aus der Indikatorübersicht zu ermöglichen.
- UX-Team: Verbesserung der Navigation und Kontexterhaltung beim Anlegen und Bearbeiten von Indikatoren, Zielen und Maßnahmen.

### Stefan

- Entwicklungsteam: Behebung des Bugs, bei dem Maßnahmenziele den Zielen und nicht den Maßnahmen zugeordnet werden.
- Entwicklungsteam: Implementierung der Möglichkeit, sowohl Gesamtziele als auch Teilziele für Indikatoren innerhalb von Zielen anzulegen.
- Entwicklungsteam: Optimierung der Detailseite eines Indikators zu einem Dashboard-ähnlichen Format mit besserer Übersicht über zugehörige Ziele und Maßnahmen.
- Entwicklungsteam: Implementierung verschiedener Wege zur Bearbeitung von Indikatoren, gewünschten Entwicklungen und Wirkungen, um unterschiedliche Nutzerkontexte zu berücksichtigen.
- Entwicklungsteam: Verbesserung der Darstellungsmöglichkeiten für sektorale Indikatoren im Rahmen des PNK-Projekts.

## Meeting

- **Indikatoren-Tool Funktionalitäten Und UX-Probleme**
Helena präsentierte Sebastian die aktuelle Funktionalität der Indikatoren in ihrem Tool und erklärte die verschiedenen Objekte, die mit Indikatoren verbunden sind, einschließlich Basisdaten, gewünschter Entwicklung in Zielen und aktuelle Planung in Maßnahmen. Sie identifizierte UX-Probleme, insbesondere dass die Navigation zu Indikatoren noch zu verschachtelt ist und nicht an der richtigen Stelle erfolgt. Helena zeigte, dass Benutzer nur die Basisdaten aktualisieren können, aber nicht die gewünschte Entwicklung in Zielen oder Ziele hinzufügen können.
- **Verbesserung Der Indikator-Ziel-Bindung**
Helena und Sebastian diskutierten die Benutzerfreundlichkeit des Prozesses zum Anlegen und Einbinden von Indikatoren in Ziele. Helena erklärte, dass der aktuelle Workflow dazu führt, dass man den Kontext verliert und zu viele Schritte durchlaufen muss, um einen Indikator an ein Ziel zu binden. Sebastian stimmte zu, dass die Filtereinstellungen, die voreingestellt werden, wenn man auf "gewünschte Entwicklung" klickt, zu dumm sind und nicht hilfreich sind. Sie diskutierten Verbesserungen wie die Einführung von Überschriften in der Indikatorenkatalog und die Anzeige neuer Indikatoren oben, um die Benutzerfreundlichkeit zu steigern.
- **Indikatoren-Setup Im Setzkasten**
Helena demonstrierte Sebastian die Funktionsweise von Indikatoren im Setzkasten, wobei sie erklärte, dass die Suche für Indikatoren nicht sinnvoll ist, da man normalerweise bereits weiß, welche Indikatoren man einbinden möchte, nachdem die Wirkungslogik für seine Strategie feststeht. Sie zeigte, wie man Indikatoren anlegt und Zielwerte sowie Basisdaten einträgt, wobei sie feststellte, dass die Zielwerte immer von 0 beginnen müssen, während die Basisdaten flexibel sind. Sebastian schlug vor, dass die Spalten in Datentabellen immer angezeigt werden sollten, auch wenn Tabellenzellen deaktiviert sind.
- **Wirkungsmanagement Und Maßnahmenstruktur**
Helena und Sebastian diskutierten die aktuelle Struktur für die Anlegung von Wirkungen in Maßnahmen, wobei Helena erklärte, dass momentan immer ein Maßnahmenziel angelegt werden muss, um Wirkungen in einer Maßnahme zu erstellen. Sie besprachen auch die Komplexität bei der Handhabung von OKRs und Wirkungszielen auf verschiedenen Ebenen. Sebastian schlug vor, dass Querverweise zwischen verschiedenen Ebenen der Indikatoren über Buttons verfügbar gemacht werden sollten, um die Navigation zu verbessern.
- **Indikatoren-Benutzeroberfläche Und Maßnahmenprobleme**
Helena und Sebastian diskutierten die Benutzeroberfläche für Indikatoren und deren Maßnahmen. Sie stellten fest, dass es derzeit ein Bug gibt, bei dem Maßnahmenziele fälschlicherweise unter den Ziele statt unter den Maßnahmen sortiert werden. Helena erklärte, dass die bestehende Tabellenansicht für Power User eine gute Möglichkeit bietet, Daten zentral zu verwalten, aber nicht bearbeitbar ist. Sie identifizierten, dass es fehlt, die Möglichkeit, Ziele direkt im Indikator anzulegen, anstatt immer über Programme zu gehen.
- **Indikatorengestützte Zielsetzung**
Helena demonstrierte Sebastian die aktuellen Funktionen zur Anlage von Indikatoren und deren Integration in Ziele und Maßnahmen, wobei sie technische Probleme und Bug-Fixes von Stefan erläuterte. Sie identifizierte ein wichtiges Problem bei der Zielsetzung, bei dem Nutzer immer eine Differenz oder einen Zielwert im Vergleich zur aktuellen Prognose angeben müssen, anstatt nur ein absolute Zahl zu definieren. Helena schlug vor, dass aus Indikatoren heraus Ziele und Maßnahmen angelegt werden sollten, die automatisch eine Verknüpfung zur gewünschten Entwicklung herstellen und vorgeschlagene Wirkungen einbinden könnten.
- **Berechnungsprobleme Im Zielwert-Tool**
Helena und Sebastian diskutierten die Probleme bei der Berechnung von Zielwerten in ihrem Tool, wobei sie feststellten, dass die aktuelle Implementierung nicht für alle Indikatoren funktioniert und bei manchen Fällen falsche Ergebnisse liefert. Sie einigten sich darauf, dass dies ein wissenschaftlicher und UX-Herausforderung ist, die vorerst nicht durch UX-Design gelöst werden kann, sondern durch die Entwicklung sicherer Berechnungsmodelle. Sebastian schlug vor, ein gemeinsames Verständnis für die Berechnung im Team zu entwickeln, bevor Verbesserungen vorgenommen werden.
- **Indikatorengestützte Steuerung Und Wirkungsebenen**
Helena erklärte Sebastian die Funktionsweise von Gesamtzielen in der Indikatorengestützten Steuerung, wobei diese nur im Detailansicht des Indikators angelegt werden können, während Teilziele in der Strategieebene definiert werden. Sie demonstrierte das Wirkungsebenenboard, mit dem gewünschte Entwicklungen aus verschiedenen Strategien kombiniert und deren Kumulation beeinflusst werden kann. Helena erläuterte außerdem den Unterschied zwischen Wirkungsketten und dem gezeigten System, wobei Wirkungsketten verschiedene Indikatoren miteinander verknüpfen, die sich gegenseitig beeinflussen, wie beispielsweise Co2-Ausstoß und Solarzellenfläche.
- **Indikatoreigenschaften Im Tool**
Sebastian und Helena diskutierten die Komplexität der Darstellung von Indikatoren in ihrem Tool und identifizierten mehrere Herausforderungen, darunter die Verknüpfung von Indikatoren mit ihren übergeordneten Zielen und Maßnahmen. Helena präsentierte eine umfassende Analyse verschiedener Indikatoreigenschaften und deren Anforderungen an Basisdaten, Trenddaten und gewünschte Entwicklungen, wobei sie feststellte, dass das Tool derzeit nur begrenzte Fähigkeiten für absolute Zielwerte und komplexe Indikatoreigenschaften bietet. Sie vereinbarten, mit einem User-Story Ansatz zu beginnen, der sich auf die Darstellung von Ist-Daten im Pnk-Projekt konzentriert, bevor sie die Funktionalitäten für Trenddaten und gewünschte Entwicklungen erweitern.
- **Indikatorene Darstellungsoptimierung**
Sebastian und Helena diskutierten die Darstellung von Indikatoren, Zielen und Maßnahmen in ihrer Anwendung. Helena schlug vor, die aktuelle Kachel-Darstellung durch eine linienbasierte Darstellung zu ersetzen, bei der alle Daten eines Indikators übereinandergelegt werden und Ziele als Zeilen über die gesamte Breite angezeigt werden. Sie einigten sich darauf, dass Pnk-Indikatoren zunächst in einem kleineren Rahmen verbessert werden sollten, bevor die Komplexität auf andere Ebenen der Anwendung skaliert wird.